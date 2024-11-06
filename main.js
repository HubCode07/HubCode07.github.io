// Initialize chat elements when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.querySelector('.chat-input');
  const sendButton = document.querySelector('.send-button');
  const mainContainer = document.querySelector('.main-container');
  const attachButton = document.getElementById('attachButton');
  const welcomeMessage = document.querySelector('.welcome-message');

  // Add responsive viewport meta tag dynamically
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
  document.head.appendChild(meta);

  // Remove welcome message after first interaction
  function removeWelcomeMessage() {
    if (welcomeMessage && welcomeMessage.parentElement) {
      welcomeMessage.style.animation = 'fadeOut 200ms var(--md-sys-motion-easing-standard)';
      setTimeout(() => {
        welcomeMessage.remove();
      }, 200);
    }
  }

  // Function to create typing indicator
  function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message bot-message typing';
    indicator.innerHTML = `
      <img src="ai.ico" class="message-avatar" alt="Jamx AI">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    return indicator;
  }

  // Function to format message content with Markdown-like syntax
  function formatMessage(text) {
    // Format code blocks with horizontal scroll
    text = text.replace(/```([^`]+)```/g, '<div class="code-block"><pre><code>$1</code></pre><button class="md-button" onclick="this.classList.add(\'copied\'); navigator.clipboard.writeText(this.previousElementSibling.textContent); setTimeout(() => this.classList.remove(\'copied\'), 2000);"><span class="material-icons">content_copy</span><div class="state-layer"></div></button></div>');
    // Format inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Format bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format lists
    text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)+/gs, '<ul class="message-list">$1</ul>');
    
    // Format numbered lists
    text = text.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)+/gs, '<ol class="message-list">$1</ol>');

    // Format tables
    text = text.replace(/\|(.+)\|/gm, (match, content) => {
      const cells = content.split('|').map(cell => cell.trim());
      return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    });
    text = text.replace(/(<tr>.*<\/tr>)+/gs, '<table class="message-table">$1</table>');

    // Handle table headers
    text = text.replace(/\|-+\|/g, ''); // Remove separator rows
    text = text.replace(/<tr>(<td>[^<]+<\/td>)+<\/tr>/, (match) => {
      return match.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    });

    // Add syntax highlighting for code blocks
    text = text.replace(/<code>(.*?)<\/code>/gs, (match, code) => {
      if (code.includes('function') || code.includes('var') || code.includes('const')) {
        return `<code class="language-javascript">${code}</code>`;
      } else if (code.includes('<') && code.includes('>')) {
        return `<code class="language-html">${code}</code>`;
      } else if (code.includes('{') && code.includes('}')) {
        return `<code class="language-css">${code}</code>`;
      } else if (code.includes('def ') || code.includes('class ') || code.includes('import ')) {
        return `<code class="language-python">${code}</code>`;
      } else if (code.includes('require ') || code.includes('end') || code.includes('def ')) {
        return `<code class="language-ruby">${code}</code>`;
      }
      return match;
    });

    return text;
  }

  // Function to handle file uploads
  async function handleFileUpload(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileData = e.target.result;
      let fileContent = '';
      let fileType = file.type;
      
      // Handle different file types
      if (fileType.startsWith('image/')) {
        // Convert image to base64 for embedding in prompt
        const base64Image = fileData.split(',')[1];
        fileContent = `<img src="${fileData}" alt="Uploaded image" style="max-width: 100%; height: auto;">`;
        
        // Add file message to chat
        addMessage(fileContent, true);

        // Show typing indicator
        const typingIndicator = createTypingIndicator();
        mainContainer.appendChild(typingIndicator);

        try {
          // Get AI response with image data
          const response = await getAIResponse('', [{
            inlineData: {
              mimeType: fileType,
              data: base64Image
            }
          }]);
          mainContainer.removeChild(typingIndicator);
          addMessage(response);
        } catch (error) {
          mainContainer.removeChild(typingIndicator);
          addMessage('Sorry, I encountered an error analyzing the image. Please try again.', false);
        }
      } else if (fileType.startsWith('video/')) {
        fileContent = `<video controls style="max-width: 100%;"><source src="${fileData}" type="${fileType}"></video>`;
        addMessage(fileContent, true);
        addMessage("I can see this video file. Let me analyze its contents for you.", false);
      } else if (fileType === 'application/pdf') {
        fileContent = `<embed src="${fileData}" type="application/pdf" width="100%" height="600px">`;
        addMessage(fileContent, true);
        addMessage("I can see this PDF file. Let me analyze its contents for you.", false);
      } else if (fileType.startsWith('audio/')) {
        fileContent = `<audio controls><source src="${fileData}" type="${fileType}"></audio>`;
        addMessage(fileContent, true);
        addMessage("I can hear this audio file. Let me analyze its contents for you.", false);
      } else {
        fileContent = `<a href="${fileData}" download="${file.name}">${file.name}</a>`;
        addMessage(fileContent, true);
        addMessage("I can see this file. Let me analyze its contents for you.", false);
      }
    };

    reader.readAsDataURL(file);
  }

  // Function to add a message to the chat
  function addMessage(text, isUser = false) {
    removeWelcomeMessage();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = isUser ? 'profile.ico' : 'ai.ico';
    avatar.alt = isUser ? 'You' : 'Jamx AI';
    messageDiv.appendChild(avatar);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = isUser ? 'You' : 'Jamx AI';
    contentDiv.appendChild(label);

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = isUser ? text : formatMessage(text);
    contentDiv.appendChild(textDiv);
    
    messageDiv.appendChild(contentDiv);
    
    messageDiv.style.animation = 'fadeIn 200ms var(--md-sys-motion-easing-standard)';
    mainContainer.appendChild(messageDiv);
    mainContainer.scrollTop = mainContainer.scrollHeight;
  }

  // Function to interact with Gemini API
  async function getAIResponse(prompt, parts = []) {
    const GEMINI_API_KEY = '';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent';

    try {
      // Add text prompt if provided
      if (prompt) {
        parts.unshift({
          text: prompt
        });
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Gemini API');
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from API');
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  // Handle send button click
  async function handleSend() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.style.overflowY = 'auto';

    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    mainContainer.appendChild(typingIndicator);

    try {
      // Get and display bot response
      const response = await getAIResponse(message);
      mainContainer.removeChild(typingIndicator);
      addMessage(response);
    } catch (error) {
      mainContainer.removeChild(typingIndicator);
      addMessage('Sorry, I encountered an error. Please try again later.', false);
    }
  }

  // Event listeners
  sendButton.addEventListener('click', handleSend);
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*,audio/*,.pdf';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  });

  // Handle attachment button click
  attachButton.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle textarea auto-resize based on screen size
  function updateTextareaSize() {
    const viewportWidth = window.innerWidth;
    let maxHeight;

    if (viewportWidth < 600) { // Mobile breakpoint
      maxHeight = window.innerHeight * 0.2; // 20% of viewport height
    } else if (viewportWidth < 840) { // Tablet breakpoint  
      maxHeight = window.innerHeight * 0.25; // 25% of viewport height
    } else { // Desktop
      maxHeight = window.innerHeight * 0.3; // 30% of viewport height
    }

    chatInput.style.height = 'auto';
    const newHeight = Math.min(chatInput.scrollHeight, maxHeight);
    chatInput.style.height = newHeight + 'px';
    chatInput.style.overflowY = chatInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  chatInput.addEventListener('input', updateTextareaSize);

  // Handle window resize with responsive breakpoints
  function handleResize() {
    const viewportWidth = window.innerWidth;
    
    // Adjust container margins and padding based on breakpoints
    if (viewportWidth < 360) { // Folding phone
      mainContainer.style.padding = '0.75rem';
      mainContainer.style.marginBottom = '60px';
    } else if (viewportWidth < 600) { // Phone
      mainContainer.style.padding = '1rem';
      mainContainer.style.marginBottom = '70px';
    } else { // Tablet/Desktop
      mainContainer.style.padding = '2rem';
      mainContainer.style.marginBottom = '80px';
    }

    // Update container height and textarea size
    mainContainer.style.height = `${window.innerHeight - 100}px`;
    updateTextareaSize();
  }

  window.addEventListener('resize', handleResize);

  // Initial setup
  handleResize();
  chatInput.focus();
});
