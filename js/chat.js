// js/chat.js
import { Network } from './network.js';
import { checkAndPromptPlayerName, getPlayerName } from './db.js';

export const ChatSystem = {
    els: {},
    playerRef: null,

    init(player) {
        this.playerRef = player;
        this.els = {
            header: document.getElementById('chat-header'),
            body: document.getElementById('chat-body'),
            form: document.getElementById('chat-form'),
            input: document.getElementById('chat-input'),
            messages: document.getElementById('chat-messages')
        };

        if (this.els.header) {
            this.els.header.addEventListener('click', () => {
                this.els.body.classList.toggle('show');
                if (this.els.body.classList.contains('show')) {
                    this.els.messages.scrollTop = this.els.messages.scrollHeight;
                    this.els.input.focus();
                }
            });
        }

        if (this.els.form) {
            this.els.form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = this.els.input.value.trim();
                if (text !== '') {
                    checkAndPromptPlayerName();
                    Network.sendChat(text);
                    this.els.input.value = '';
                    this.els.input.blur();
                }
            });
        }

        Network.onChatHistoryReceived = (history) => {
            if (!this.els.messages) return;
            this.els.messages.innerHTML = '';
            if (history.length === 0) {
                this.els.messages.innerHTML = '<div class="chat-placeholder">Kênh thế giới đang trống!</div>';
                return;
            }
            history.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'chat-msg expired';
                div.innerHTML = `<strong>${msg.playerName}:</strong> ${msg.text}`;
                this.els.messages.appendChild(div);
            });
            this.els.messages.scrollTop = this.els.messages.scrollHeight;
        };

        Network.onNewChatMessage = (msg) => {
            if (!this.els.messages) return;
            const placeholder = this.els.messages.querySelector('.chat-placeholder');
            if (placeholder) placeholder.remove();

            const div = document.createElement('div');
            div.className = 'chat-msg';
            div.innerHTML = `<strong>${msg.playerName}:</strong> ${msg.text}`;
            this.els.messages.appendChild(div);

            while (this.els.messages.children.length > 15) {
                this.els.messages.removeChild(this.els.messages.firstChild);
            }
            this.els.messages.scrollTop = this.els.messages.scrollHeight;

            setTimeout(() => {
                if (div.parentNode) div.classList.add('expired');
            }, 6000);
            
            if (msg.playerName === getPlayerName()) {
                this.playerRef.setChat(msg.text);
            }
            Object.values(Network.otherPlayers).forEach(op => {
                if (op.playerName === msg.playerName) op.setChat(msg.text);
            });
        };
    }
};