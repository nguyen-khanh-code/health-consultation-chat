/**
 * @fileoverview A health consultation chatbot powered by the Gemini API.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {GoogleGenAI, type Chat} from '@google/genai';

interface Message {
  role: 'user' | 'model' | 'loading';
  text: string;
}

@customElement('health-chat-app')
export class HealthChatApp extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      margin: 0;
      box-sizing: border-box;
      font-family: 'Google Sans', sans-serif;
      background-color: #f0f4f8;
    }

    .chat-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      padding: 10px 15px;
      border-radius: 18px;
      max-width: 80%;
      width: fit-content;
      word-wrap: break-word;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .user-message {
      background-color: #007bff;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .model-message {
      background-color: #ffffff;
      color: #333;
      align-self: flex-start;
      border: 1px solid #e0e0e0;
      border-bottom-left-radius: 4px;
    }

    .loading-indicator {
      align-self: flex-start;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 10px 15px;
    }
    .loading-dot {
      width: 8px;
      height: 8px;
      background-color: #999;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .loading-dot:nth-child(1) { animation-delay: -0.32s; }
    .loading-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }

    .form-container {
      display: flex;
      padding: 10px 20px;
      background-color: #ffffff;
      border-top: 1px solid #dde3ea;
      gap: 10px;
      align-items: center;
    }

    textarea {
      flex-grow: 1;
      padding: 12px;
      border-radius: 24px;
      border: 1px solid #ccc;
      resize: none;
      font-family: inherit;
      font-size: 16px;
      line-height: 1.5;
      max-height: 120px;
      transition: height 0.2s;
      scrollbar-width: none;
    }
     textarea::-webkit-scrollbar {
        display: none;
    }
    textarea:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    button {
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s;
    }

    button:hover:not(:disabled) {
      background-color: #0056b3;
    }

    button:disabled {
      background-color: #a0a0a0;
      cursor: not-allowed;
    }

    svg {
      width: 24px;
      height: 24px;
    }
  `;

  @state() private messages: Message[] = [];
  @state() private isLoading = false;
  
  @query('.chat-container') private chatContainer!: HTMLDivElement;
  @query('textarea') private textarea!: HTMLTextAreaElement;

  private ai: GoogleGenAI;
  private chat: Chat;

  constructor() {
    super();
    // Use process.env.API_KEY as per the guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const systemInstruction = "Bạn là một chuyên gia tư vấn sức khỏe AI. Cung cấp thông tin hữu ích, chính xác và an toàn. Luôn nhắc nhở người dùng rằng bạn không phải là bác sĩ và họ nên tham khảo ý kiến của chuyên gia y tế cho các vấn đề y tế nghiêm trọng. Trả lời bằng tiếng Việt.";
    
    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      }
    });

    this.messages = [
      {
        role: 'model',
        text: 'Xin chào! Tôi là trợ lý sức khỏe AI của bạn. Bạn có câu hỏi nào về sức khỏe không? Xin lưu ý, tôi không thể đưa ra chẩn đoán y khoa.'
      }
    ];
  }

  override async updated(changedProperties: Map<string | symbol, unknown>) {
    if (changedProperties.has('messages')) {
      await this.updateComplete;
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }
  
  private handleInput() {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;
  }

  private async handleSendMessage(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const prompt = (formData.get('prompt') as string).trim();
    
    if (!prompt || this.isLoading) {
      return;
    }
    
    this.messages = [...this.messages, { role: 'user', text: prompt }, { role: 'loading', text: '' }];
    this.isLoading = true;
    this.textarea.value = '';
    this.handleInput(); // Reset height

    try {
      const stream = await this.chat.sendMessageStream({ message: prompt });
      
      let firstChunk = true;
      let modelResponse = '';

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        modelResponse += chunkText;
        if(firstChunk) {
          // Replace loading indicator with model message on first chunk
          this.messages = [...this.messages.slice(0, -1), { role: 'model', text: modelResponse }];
          firstChunk = false;
        } else {
          // Update the last model message
          const lastMessage = this.messages[this.messages.length - 1];
          lastMessage.text = modelResponse;
          this.requestUpdate('messages');
        }
      }

    } catch (error) {
      console.error(error);
      const errorMessage = "Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.";
      // Replace loading indicator with an error message
      this.messages = [...this.messages.slice(0, -1), { role: 'model', text: errorMessage }];
    } finally {
      this.isLoading = false;
    }
  }

  override render() {
    return html`
      <div class="chat-container">
        ${this.messages.map(msg => {
          if (msg.role === 'loading') {
            return html`
              <div class="loading-indicator">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
              </div>
            `;
          }
          const classes = {
            message: true,
            'user-message': msg.role === 'user',
            'model-message': msg.role === 'model',
          };
          return html`<div class=${classMap(classes)}>${msg.text}</div>`;
        })}
      </div>
      <form class="form-container" @submit=${this.handleSendMessage}>
        <textarea
          name="prompt"
          placeholder="Nhập câu hỏi của bạn..."
          .disabled=${this.isLoading}
          @input=${this.handleInput}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLElement).closest('form')?.requestSubmit();
            }
          }}
        ></textarea>
        <button type="submit" .disabled=${this.isLoading} aria-label="Gửi">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-chat-app': HealthChatApp;
  }
}
