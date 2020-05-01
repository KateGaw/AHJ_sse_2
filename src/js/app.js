import moment from 'moment';

const url = 'https://sse-2.herokuapp.com/users';
// const url = 'http://localhost:7070/users';

const formNickname = document.querySelector('.form');
const errMessage = document.querySelector('#errMessage');
let nickname = '';

class Messenger {
  constructor(name) {
    this.nickname = name;
    this.url = 'wss://sse-2.herokuapp.com/ws';
    // this.url = 'ws://localhost:7070/ws';
  }

  init() {
    this.messenger = document.querySelector('.messenger');
    this.messageInput = document.querySelector('#messageInput');
    this.messageList = document.querySelector('#messageList');
    this.messenger.classList.remove('hidden');

    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('open', () => {
      console.log('connected');
    });
    this.ws.addEventListener('message', (event) => {
      this.drawMessage(event);
    });
    this.ws.addEventListener('close', (event) => {
      console.log('connection closed', event);
    });
    this.ws.addEventListener('error', () => {
      console.log('error');
    });

    this.drawUsers();

    window.addEventListener('beforeunload', () => {
      this.ws.close(1000, 'finish');
      fetch(`${url}/${this.nickname}`, {
        method: 'DELETE',
      });
      this.drawUsers();
    });

    this.messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && this.messageInput.value) {
        if (this.ws.readyState === WebSocket.OPEN) {
          const mess = {
            type: 'message',
            name: this.nickname,
            mess: this.messageInput.value,
            date: new Date(),
          };
          this.ws.send(JSON.stringify(mess));
        } else {
          console.log('Reconect');
          this.ws = new WebSocket(this.url);
        }
        this.messageInput.value = '';
      }
    });
  }

  async drawUsers() {
    const response = await fetch(url);
    const usersArray = await response.json();
    const usersList = document.querySelector('#usersList');
    usersList.innerHTML = '';
    for (const item of usersArray) {
      const user = document.createElement('div');
      user.className = 'item-user';
      user.innerHTML = `
              <div class="userImg"></div>
              <div class="userNickname ${
  item.name === this.nickname ? 'active' : ''
}">${item.name}</div>`;
      usersList.appendChild(user);
    }
  }

  drawMessage(message) {
    const { type } = JSON.parse(message.data);

    if (type === 'message') {
      const { name, mess, date } = JSON.parse(message.data);
      const liMessage = document.createElement('li');
      liMessage.className = `messageLi ${
        this.nickname === name ? 'active' : ''
      }`;
      liMessage.innerHTML = `
              <div class="header">
                <span>${this.nickname === name ? 'You' : name},</span>
                <span>${moment(date).format('HH:mm DD.MM.YYYY')}</span>
              </div>
              <div class="messageLi">${mess}</div>`;

      this.messageList.appendChild(liMessage);
      this.messageList.scrollTo(0, liMessage.offsetTop);
    } else if (type === 'adding' || type === 'deleting') {
      this.drawUsers();
    }
  }
}

document.querySelector('#submitButton').addEventListener('click', async () => {
  const inputName = document.querySelector('#nicknameInput');
  nickname = inputName.value;

  if (nickname) {
    const response = await fetch(url);
    const usersArray = await response.json();

    if (usersArray.findIndex((item) => item.name === nickname) === -1) {
      await fetch(url, {
        body: JSON.stringify({ name: nickname }),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      formNickname.classList.add('hidden');
      inputName.value = '';
      const messenger = new Messenger(nickname);
      messenger.init();
    } else {
      errMessage.classList.remove('hidden');
    }
  }
});

document.querySelector('#submitBtn').addEventListener('click', () => {
  errMessage.classList.add('hidden');
});
