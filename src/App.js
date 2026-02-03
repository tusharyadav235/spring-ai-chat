import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/chat';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'summarize', or 'history'
  const [summarizeText, setSummarizeText] = useState('');
  const [summary, setSummary] = useState('');
  const [recentChats, setRecentChats] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadRecentChats();
    }
  }, [activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadRecentChats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/recent`);
      setRecentChats(response.data);
    } catch (error) {
      console.error('Error loading recent chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/send`, {
        message: inputMessage,
        sessionId: sessionId || undefined
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (!sessionId) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!summarizeText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/summarize`, {
        text: summarizeText
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error summarizing text:', error);
      setSummary('Error: Could not generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      try {
        await axios.delete(`${API_BASE_URL}/history/${sessionId}`);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
    setMessages([]);
    setSessionId('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'chat') {
        sendMessage();
      } else if (activeTab === 'summarize') {
        handleSummarize();
      }
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🤖 AI Chat Assistant</h1>
          <p>Powered by Spring Boot & Spring AI</p>
        </header>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`tab ${activeTab === 'summarize' ? 'active' : ''}`}
            onClick={() => setActiveTab('summarize')}
          >
            📝 Summarize
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📚 History
          </button>
        </div>

        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>👋 Start a conversation!</p>
                  <p className="subtitle">Ask me anything...</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`}>
                    <div className="message-header">
                      <span className="role">
                        {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                      </span>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))
              )}
              {loading && (
                <div className="message assistant">
                  <div className="message-header">
                    <span className="role">🤖 AI</span>
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  rows="3"
                  disabled={loading}
                />
                <div className="button-group">
                  <button
                    onClick={sendMessage}
                    disabled={loading || !inputMessage.trim()}
                    className="send-button"
                  >
                    {loading ? '⏳ Sending...' : '📤 Send'}
                  </button>
                  <button
                    onClick={clearChat}
                    className="clear-button"
                    disabled={messages.length === 0}
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
              {sessionId && (
                <div className="session-info">
                  Session ID: {sessionId.substring(0, 8)}...
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'summarize' && (
          <div className="summarize-container">
            <div className="summarize-input">
              <label>Enter text to summarize:</label>
              <textarea
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste your text here..."
                rows="10"
                disabled={loading}
              />
              <button
                onClick={handleSummarize}
                disabled={loading || !summarizeText.trim()}
                className="summarize-button"
              >
                {loading ? '⏳ Summarizing...' : '✨ Generate Summary'}
              </button>
            </div>

            {summary && (
              <div className="summary-result">
                <h3>📋 Summary:</h3>
                <div className="summary-content">{summary}</div>
                <button
                  onClick={() => {
                    setSummary('');
                    setSummarizeText('');
                  }}
                  className="clear-button"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-container">
            <div className="history-header">
              <h2>📚 Chat History</h2>
              <button onClick={loadRecentChats} className="refresh-button" disabled={loading}>
                {loading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {loading && recentChats.length === 0 ? (
              <div className="empty-state">
                <p>⏳ Loading chat history...</p>
              </div>
            ) : recentChats.length === 0 ? (
              <div className="empty-state">
                <p>📭 No chat history yet</p>
                <p className="subtitle">Start a conversation in the Chat tab!</p>
              </div>
            ) : (
              <div className="history-list">
                {(() => {
                  // Group messages by session
                  const sessions = {};
                  recentChats.forEach(msg => {
                    if (!sessions[msg.sessionId]) {
                      sessions[msg.sessionId] = [];
                    }
                    sessions[msg.sessionId].push(msg);
                  });

                  return Object.entries(sessions).map(([sessId, msgs]) => {
                    const firstMessage = msgs[0];
                    const lastMessage = msgs[msgs.length - 1];
                    const messageCount = msgs.length;
                    const preview = msgs.find(m => m.role === 'user')?.content || 'Chat session';
                    
                    return (
                      <div key={sessId} className="history-item">
                        <div className="history-item-header">
                          <div className="history-item-info">
                            <span className="history-session-id">
                              Session: {sessId.substring(0, 8)}...
                            </span>
                            <span className="history-timestamp">
                              {new Date(lastMessage.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <span className="history-message-count">
                            {messageCount} messages
                          </span>
                        </div>
                        <div className="history-preview">
                          {preview.substring(0, 100)}
                          {preview.length > 100 ? '...' : ''}
                        </div>
                        <div className="history-actions">
                          <button
                            onClick={() => {
                              setSessionId(sessId);
                              setMessages(msgs.map(m => ({
                                role: m.role,
                                content: m.content,
                                timestamp: m.timestamp
                              })));
                              setActiveTab('chat');
                            }}
                            className="load-button"
                          >
                            💬 Load Chat
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this chat session?')) {
                                try {
                                  await axios.delete(`${API_BASE_URL}/history/${sessId}`);
                                  loadRecentChats();
                                } catch (error) {
                                  console.error('Error deleting session:', error);
                                  alert('Failed to delete session');
                                }
                              }
                            }}
                            className="delete-button"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;