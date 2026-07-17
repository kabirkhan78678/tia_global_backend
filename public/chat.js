// TIA Global Socket Chat Sandbox Client Logic - Callback-Free (Emit/Listen) Pattern

let socket = null;
let currentToken = localStorage.getItem('chat_token');
let currentUser = JSON.parse(localStorage.getItem('chat_user') || 'null');
let activeConversationId = null;
let activePartner = null; // { role, id, name }
let activeTab = 'conversations'; // conversations | contacts

// UI Elements
const loginOverlay = document.getElementById('login-overlay');
const workspace = document.getElementById('workspace');
const socketStatus = document.getElementById('socket-status');
const socketStatusText = socketStatus.querySelector('.status-text');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const currentUserRole = document.getElementById('current-user-role');
const conversationsList = document.getElementById('conversations-list');
const contactsList = document.getElementById('contacts-list');
const chatWelcomeScreen = document.getElementById('chat-welcome-screen');
const chatWindow = document.getElementById('chat-window');
const activePartnerAvatar = document.getElementById('active-partner-avatar');
const activePartnerName = document.getElementById('active-partner-name');
const activePartnerRole = document.getElementById('active-partner-role');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const loginError = document.getElementById('login-error');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (currentToken && currentUser) {
    showWorkspace();
    connectSocket();
  } else {
    showLogin();
  }
});

// Switch screens
function showLogin() {
  loginOverlay.classList.remove('hidden');
  workspace.classList.add('hidden');
}

function showWorkspace() {
  loginOverlay.classList.add('hidden');
  workspace.classList.remove('hidden');
  
  // Set current user details
  currentUserName.textContent = currentUser.name || currentUser.email;
  currentUserRole.textContent = currentUser.role;
  currentUserRole.className = `role-badge ${currentUser.role}`;
  currentUserAvatar.textContent = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
  currentUserAvatar.style.backgroundColor = getRoleColor(currentUser.role);
}

// Log out
function logout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem('chat_token');
  localStorage.removeItem('chat_user');
  currentToken = null;
  currentUser = null;
  activeConversationId = null;
  activePartner = null;
  
  showLogin();
}

// Quick sandbox login helper
async function quickLogin(email) {
  loginError.textContent = '';
  try {
    const response = await fetch('/api/users/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: 'Password123'
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Login failed');
    }

    // Save token and get role details
    currentToken = result.data.token;
    localStorage.setItem('chat_token', currentToken);
    
    // Fetch profile to get real names
    const profileResponse = await fetch('/api/users/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });
    
    const profileResult = await profileResponse.json();
    if (!profileResult.success) {
      throw new Error('Could not fetch user profile details');
    }

    let userDetails = {};
    if (result.data.role === 'student') {
      const studentData = profileResult.data.student;
      userDetails = {
        id: studentData.id,
        role: 'student',
        email: studentData.email,
        name: `${studentData.firstName} ${studentData.lastName}`.trim()
      };
    } else {
      const userData = profileResult.data.user;
      userDetails = {
        id: userData.id,
        role: userData.role,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`.trim()
      };
    }

    currentUser = userDetails;
    localStorage.setItem('chat_user', JSON.stringify(currentUser));

    showWorkspace();
    connectSocket();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

// Manual Login Form submit handler
async function handleManualLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  loginError.textContent = '';
  try {
    const response = await fetch('/api/users/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Invalid credentials');
    }

    currentToken = result.data.token;
    localStorage.setItem('chat_token', currentToken);
    
    // Fetch profile
    const profileResponse = await fetch('/api/users/auth/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    
    const profileResult = await profileResponse.json();
    if (!profileResult.success) {
      throw new Error('Profile fetch failed');
    }
    
    let userDetails = {};
    if (result.data.role === 'student') {
      const studentData = profileResult.data.student;
      userDetails = {
        id: studentData.id,
        role: 'student',
        email: studentData.email,
        name: `${studentData.firstName} ${studentData.lastName}`.trim()
      };
    } else {
      const userData = profileResult.data.user;
      userDetails = {
        id: userData.id,
        role: userData.role,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`.trim()
      };
    }

    currentUser = userDetails;
    localStorage.setItem('chat_user', JSON.stringify(currentUser));
    
    showWorkspace();
    connectSocket();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

// Socket Connection & Listeners
function connectSocket() {
  if (socket) {
    socket.disconnect();
  }

  // Connect to workspace socket server
  socket = io('/', {
    auth: {
      token: currentToken
    }
  });

  socket.on('connect', () => {
    socketStatus.className = 'status-badge connected';
    socketStatusText.textContent = 'Connected';
    loadSidebarData();
  });

  socket.on('disconnect', () => {
    socketStatus.className = 'status-badge disconnected';
    socketStatusText.textContent = 'Disconnected';
  });

  socket.on('connect_error', (err) => {
    socketStatus.className = 'status-badge disconnected';
    socketStatusText.textContent = 'Connection Error';
    console.error('Socket Connection Error:', err);
  });

  // Central Event Listeners (Replacements for Acks)
  
  socket.on('chat:list:response', (ack) => {
    if (!ack.success) {
      conversationsList.innerHTML = `<div class="empty-state error-msg">Failed to load: ${ack.error?.message}</div>`;
      return;
    }
    
    const conversations = ack.data.conversations || [];
    if (conversations.length === 0) {
      conversationsList.innerHTML = '<div class="empty-state">No conversations yet.</div>';
      updateUnreadBadge(0);
      return;
    }
    
    conversationsList.innerHTML = '';
    let totalUnread = 0;
    
    conversations.forEach(convo => {
      totalUnread += convo.unreadCount;
      const partner = convo.otherParticipant;
      if (!partner) return;
      
      const lastMsgText = convo.lastMessage ? convo.lastMessage.body : 'No messages yet';
      const lastMsgTime = convo.lastMessage ? formatTime(convo.lastMessage.createdAt) : '';
      const unreadBadge = convo.unreadCount > 0 ? `<span class="count-badge">${convo.unreadCount}</span>` : '';
      const isActive = activeConversationId && Number(activeConversationId) === Number(convo.id) ? 'active' : '';

      const item = document.createElement('div');
      item.className = `list-item ${isActive}`;
      item.onclick = () => selectConversation(convo.id, partner);
      
      const initial = (partner.fullName || partner.email || 'U').charAt(0).toUpperCase();
      const color = getRoleColor(partner.role);

      item.innerHTML = `
        <div class="avatar" style="background-color: ${color}">${initial}</div>
        <div class="item-details">
          <div class="item-row-top">
            <span class="item-name">${partner.fullName}</span>
            <span class="item-time">${lastMsgTime}</span>
          </div>
          <div class="item-row-bottom">
            <span class="item-snippet">${lastMsgText}</span>
            ${unreadBadge}
          </div>
        </div>
      `;
      conversationsList.appendChild(item);
    });

    updateUnreadBadge(totalUnread);
  });

  socket.on('chat:contacts:response', (ack) => {
    if (!ack.success) {
      contactsList.innerHTML = `<div class="empty-state error-msg">Failed to load contacts: ${ack.error?.message}</div>`;
      return;
    }
    
    contactsList.innerHTML = '';
    const data = ack.data;
    let hasContacts = false;

    // Helper to render contact rows
    const renderContactList = (title, contacts, role) => {
      if (!contacts || contacts.length === 0) return;
      hasContacts = true;

      const header = document.createElement('div');
      header.className = 'divider';
      header.innerHTML = `<span>${title}</span>`;
      contactsList.appendChild(header);

      contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.onclick = () => createConversation(contact.id, role, contact.fullName);
        
        const initial = (contact.fullName || contact.email || 'U').charAt(0).toUpperCase();
        const color = getRoleColor(role);
        const subText = role === 'teacher' ? `Grade: ${contact.teachingGrade || 'N/A'}` : contact.email;

        item.innerHTML = `
          <div class="avatar" style="background-color: ${color}">${initial}</div>
          <div class="item-details">
            <div class="item-row-top">
              <span class="item-name">${contact.fullName}</span>
              <span class="role-badge ${role}">${role}</span>
            </div>
            <div class="item-row-bottom">
              <span class="item-snippet">${subText}</span>
            </div>
          </div>
        `;
        contactsList.appendChild(item);
      });
    };

    if (currentUser.role === 'teacher') {
      renderContactList('STUDENTS', data.students, 'student');
      renderContactList('PARENTS', data.parents, 'parent');
    } else {
      renderContactList('TEACHERS', data.teachers, 'teacher');
    }

    if (!hasContacts) {
      contactsList.innerHTML = '<div class="empty-state">No eligible contacts assigned in your grade level.</div>';
    }
  });

  socket.on('chat:messages:response', (ack) => {
    if (!ack.success) {
      messagesContainer.innerHTML = `<div class="empty-state error-msg">Failed to load messages: ${ack.error?.message}</div>`;
      return;
    }

    messagesContainer.innerHTML = '';
    const messages = ack.data.messages || [];
    
    if (messages.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-state">No messages. Say hello!</div>';
      return;
    }

    messages.forEach(msg => {
      appendMessage(msg);
    });

    scrollToBottom();

    // Mark active conversation read up to latest message
    const latestMsg = messages[messages.length - 1];
    if (latestMsg) {
      socket.emit('chat:read', { conversationId: activeConversationId, messageId: latestMsg.id });
    }
  });

  socket.on('chat:conversation:create:response', (ack) => {
    if (!ack.success) {
      alert(`Could not start chat: ${ack.error?.message}`);
      return;
    }
    
    // Switch to chats tab
    switchSidebarTab('conversations');
    
    // Locate the other participant
    const conversation = ack.data;
    let partner = null;
    if (currentUser.role === 'teacher') {
      partner = conversation.participants.student || conversation.participants.parent;
    } else {
      partner = conversation.participants.teacher;
    }

    if (partner) {
      selectConversation(conversation.id, partner);
    }
  });

  socket.on('chat:message:send:response', (ack) => {
    if (!ack.success) {
      alert(`Message failed: ${ack.error?.message}`);
      return;
    }
    messageInput.value = '';
  });

  socket.on('chat:read:response', (ack) => {
    if (!ack.success) {
      console.error('Read Cursor Sync Failed:', ack.error);
    }
  });

  socket.on('chat:error', (error) => {
    console.error('Socket Chat Error:', error);
  });

  // Real-time Broadcasters (Outbound pushes from the server)
  
  socket.on('chat:message:new', (payload) => {
    const { conversation, message } = payload;
    
    // If the message is for our currently active open conversation
    if (activeConversationId && Number(activeConversationId) === Number(conversation.id)) {
      appendMessage(message);
      scrollToBottom();
      
      // Mark as read immediately
      socket.emit('chat:read', { conversationId: conversation.id, messageId: message.id });
    }

    // Refresh conversation list snippets
    if (activeTab === 'conversations') {
      loadConversations();
    }
  });

  socket.on('chat:list:update', (payload) => {
    if (activeTab === 'conversations') {
      loadConversations();
    }
  });

  socket.on('chat:read:update', (payload) => {
    const { conversationId, messageId, reader } = payload;
    // If we have active conversation open, verify read receipts
    if (activeConversationId && Number(activeConversationId) === Number(conversationId)) {
      updateReadReceipts(messageId, reader);
    }
  });
}

// Load sidebar items depending on tab
function loadSidebarData() {
  if (activeTab === 'conversations') {
    loadConversations();
  } else {
    loadContacts();
  }
}

function switchSidebarTab(tab) {
  activeTab = tab;
  document.getElementById('tab-conversations').className = `tab-btn ${tab === 'conversations' ? 'active' : ''}`;
  document.getElementById('tab-contacts').className = `tab-btn ${tab === 'contacts' ? 'active' : ''}`;
  
  if (tab === 'conversations') {
    conversationsList.remove('hidden');
    contactsList.classList.add('hidden');
    loadConversations();
  } else {
    conversationsList.classList.add('hidden');
    contactsList.classList.remove('hidden');
    loadContacts();
  }
}

// Fetch and render conversations list
function loadConversations() {
  if (!socket) return;
  conversationsList.innerHTML = '<div class="empty-state">Loading chats...</div>';
  socket.emit('chat:list', {});
}

function updateUnreadBadge(count) {
  const badge = document.getElementById('unread-conversations-badge');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// Fetch and render contacts list
function loadContacts() {
  if (!socket) return;
  contactsList.innerHTML = '<div class="empty-state">Loading contacts...</div>';
  socket.emit('chat:contacts', {});
}

// Select and open an existing conversation
function selectConversation(convoId, partner) {
  activeConversationId = convoId;
  activePartner = {
    id: partner.id,
    role: partner.role,
    name: partner.fullName || partner.name
  };

  // UI state updates
  chatWelcomeScreen.classList.add('hidden');
  chatWindow.classList.remove('hidden');
  activePartnerName.textContent = partner.fullName || partner.name;
  activePartnerRole.textContent = partner.role;
  activePartnerRole.className = `role-badge ${partner.role}`;
  activePartnerAvatar.textContent = (partner.fullName || partner.name || 'C').charAt(0).toUpperCase();
  activePartnerAvatar.style.backgroundColor = getRoleColor(partner.role);

  // Hilight selected list item
  const items = conversationsList.querySelectorAll('.list-item');
  items.forEach(el => el.classList.remove('active'));

  // Load message thread
  loadMessages(convoId);
}

// Create a new conversation channel
function createConversation(recipientId, recipientRole, fullName) {
  if (!socket) return;
  socket.emit('chat:conversation:create', { recipientId, recipientRole });
}

// Fetch messages for a conversation
function loadMessages(conversationId) {
  if (!socket) return;
  messagesContainer.innerHTML = '<div class="empty-state">Loading messages...</div>';
  socket.emit('chat:messages', { conversationId });
}

// Append message node to layout
function appendMessage(msg) {
  // If empty state exists, remove it
  const empty = messagesContainer.querySelector('.empty-state');
  if (empty) empty.remove();

  const isOutgoing = msg.sender.id === currentUser.id && msg.sender.role === currentUser.role;
  const senderRole = msg.sender.role;
  
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;
  wrapper.setAttribute('data-msg-id', msg.id);

  const senderName = isOutgoing ? 'You' : (activePartner.name || activePartner.role);
  const formattedTime = formatTime(msg.createdAt);

  let ticks = '';
  if (isOutgoing) {
    ticks = `<span class="read-status">✓</span>`;
  }

  wrapper.innerHTML = `
    <span class="message-sender-name">
      ${senderName} <span class="role-badge ${senderRole}" style="font-size:0.55rem; padding: 1px 4px;">${senderRole}</span>
    </span>
    <div class="message-bubble">
      ${msg.body}
    </div>
    <div class="message-meta">
      <span>${formattedTime}</span>
      ${ticks}
    </div>
  `;

  messagesContainer.appendChild(wrapper);
}

// Update ticks on read confirmation
function updateReadReceipts(messageId, reader) {
  const outgoingMessages = messagesContainer.querySelectorAll('.message-wrapper.outgoing');
  outgoingMessages.forEach(el => {
    const msgId = Number(el.getAttribute('data-msg-id'));
    if (msgId && msgId <= Number(messageId)) {
      const readBadge = el.querySelector('.read-status');
      if (readBadge) {
        readBadge.innerHTML = '✓✓';
        readBadge.className = 'read-status read';
      }
    }
  });
}

// Send Message
function sendMessage(event) {
  event.preventDefault();
  if (!socket || !activeConversationId) return;

  const text = messageInput.value.trim();
  if (!text) return;

  const payload = {
    conversationId: activeConversationId,
    body: text
  };

  socket.emit('chat:message:send', payload);
}

// Helpers
function getRoleColor(role) {
  switch (role) {
    case 'teacher': return 'var(--color-teacher)';
    case 'parent': return 'var(--color-parent)';
    case 'student': return 'var(--color-student)';
    default: return 'var(--bg-accent)';
  }
}

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
