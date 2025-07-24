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
      justify-content: center;
      align-items: center;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      font-family: 'Google Sans', sans-serif;
    }

    .app-container {
      width: 100%;
      height: 100%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background-color: #00796B; /* Darker Teal */
      color: white;
      flex-shrink: 0;
    }
    
    header svg {
      width: 28px;
      height: 28px;
    }

    header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .chat-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      max-width: 85%;
    }

    .user-wrapper {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .model-wrapper {
      align-self: flex-start;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #E0E0E0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar svg {
      width: 24px;
      height: 24px;
      color: #5f6368;
    }

    .user-wrapper .avatar {
      background-color: #00796B;
    }
    
    .user-wrapper .avatar svg {
       color: #ffffff;
    }


    .message {
      padding: 12px 16px;
      border-radius: 20px;
      word-wrap: break-word;
      line-height: 1.5;
      white-space: pre-wrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .user-message {
      background-color: #00796B; /* Darker Teal */
      color: white;
      border-bottom-right-radius: 5px;
    }

    .model-message {
      background-color: #F1F3F4; /* Light Gray */
      color: #202124;
      border-bottom-left-radius: 5px;
    }

    .loading-indicator {
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 12px 16px;
    }
    .loading-dot {
      width: 8px;
      height: 8px;
      background-color: #00796B;
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
      padding: 12px 20px;
      background-color: #F1F3F4;
      gap: 12px;
      align-items: center;
      border-top: 1px solid #E0E0E0;
    }

    textarea {
      flex-grow: 1;
      padding: 14px 20px;
      border-radius: 24px;
      border: 1px solid #DCDCDC;
      resize: none;
      font-family: inherit;
      font-size: 16px;
      line-height: 1.5;
      max-height: 120px;
      transition: height 0.2s;
      scrollbar-width: none;
      background-color: #FFFFFF;
    }
     textarea::-webkit-scrollbar {
        display: none;
    }
    textarea:focus {
      outline: none;
      border-color: #00796B;
      box-shadow: 0 0 0 2px rgba(0, 121, 107, 0.2);
    }

    button {
      background-color: #00796B;
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
      background-color: #004D40;
    }

    button:disabled {
      background-color: #BDBDBD;
      cursor: not-allowed;
    }

    button svg {
      width: 24px;
      height: 24px;
    }

    footer {
      padding: 10px 20px;
      text-align: center;
      font-size: 12px;
      color: #5f6368;
      background-color: #F1F3F4;
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
  
  private renderMessage(msg: Message) {
      const userAvatar = html`
        <div class="avatar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
      `;
      const modelAvatar = html`
        <div class="avatar">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>
        </div>
      `;

      if (msg.role === 'loading') {
        return html`
          <div class="message-wrapper model-wrapper">
             ${modelAvatar}
            <div class="message model-message loading-indicator">
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
            </div>
          </div>
        `;
      }
      
      const wrapperClasses = {
        'message-wrapper': true,
        'user-wrapper': msg.role === 'user',
        'model-wrapper': msg.role === 'model',
      };

      const messageClasses = {
        message: true,
        'user-message': msg.role === 'user',
        'model-message': msg.role === 'model',
      };
      
      return html`
        <div class=${classMap(wrapperClasses)}>
          ${msg.role === 'user' ? userAvatar : modelAvatar}
          <div class=${classMap(messageClasses)}>${msg.text}</div>
        </div>
      `;
  }

  override render() {
    return html`
      <div class="app-container">
        <header>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>
          <h2>Tư Vấn Sức Khỏe AI</h2>
        </header>
        <div class="chat-container">
          ${this.messages.map(msg => this.renderMessage(msg))}
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
        <footer>
          Phát triển bởi Nguyễn Duy Khánh Đợt đào tạo thực tế Hợp tác giữa FPT Polytechnic và IMTA TECH, Cán bộ Hướng dẫn: Trần Tuấn Thành.
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-chat-app': HealthChatApp;
  }
}
