// Function to create the custom wait cursor
export const createCustomWaitCursor = () => {
  // Create container
  const cursorContainer = document.createElement('div');
  cursorContainer.id = 'custom-cursor-container';
  cursorContainer.style.position = 'fixed';
  cursorContainer.style.top = '0';
  cursorContainer.style.left = '0';
  cursorContainer.style.width = '100%';
  cursorContainer.style.height = '100%';
  cursorContainer.style.pointerEvents = 'none';
  cursorContainer.style.zIndex = '9999';
  
  // Create the cursor element
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  cursor.style.position = 'absolute';
  cursor.style.width = '24px';
  cursor.style.height = '24px';
  cursor.style.transform = 'translate(-50%, -50%)';
  
  // Add SVG spinner
  cursor.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="custom-cursor-spinner">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  `;
  
  // Add style for animation
  const style = document.createElement('style');
  style.textContent = `
    body.custom-cursor-active {
      cursor: none !important;
    }
    
    .custom-cursor-spinner {
      animation: cursor-spin 1s linear infinite;
    }
    
    @keyframes cursor-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  // Append elements to DOM
  document.head.appendChild(style);
  cursorContainer.appendChild(cursor);
  document.body.appendChild(cursorContainer);

  console.log('yay', cursorContainer);
  
  // Track mouse position
  function updateCursorPosition(e) {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  }
  
  // Toggle cursor on/off with Escape key
  let isActive = true;
  
  function toggleCursor(e) {
    if (e.key === 'Escape') {
      isActive = !isActive;
      document.body.classList.toggle('custom-cursor-active', isActive);
      cursorContainer.style.display = isActive ? 'block' : 'none';
    }
  }
  
  // Initialize and add event listeners
  function init() {
    document.body.classList.add('custom-cursor-active');
    document.addEventListener('mousemove', updateCursorPosition);
    document.addEventListener('keydown', toggleCursor);
  }
  
  // Cleanup function
  function destroy() {
    document.body.classList.remove('custom-cursor-active');
    document.removeEventListener('mousemove', updateCursorPosition);
    document.removeEventListener('keydown', toggleCursor);
    
    if (cursorContainer.parentNode) {
      cursorContainer.parentNode.removeChild(cursorContainer);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }
  
  // Initialize
  init();
  
  // Return control functions
  return {
    show: function() {
      isActive = true;
      document.body.classList.add('custom-cursor-active');
      cursorContainer.style.display = 'block';
    },
    hide: function() {
      isActive = false;
      document.body.classList.remove('custom-cursor-active');
      cursorContainer.style.display = 'none';
    },
    destroy: destroy
  };
}

// Usage example:
// const waitCursor = createCustomWaitCursor();
// 
// // To hide the cursor
// // waitCursor.hide();
//
// // To show the cursor again
// // waitCursor.show();
//
// // To completely remove it
// // waitCursor.destroy();