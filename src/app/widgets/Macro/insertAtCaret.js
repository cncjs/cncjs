// http://stackoverflow.com/questions/1064089/inserting-a-text-where-cursor-is-using-javascript-jquery
const insertAtCaret = (textarea, text = '') => {
  const scrollPos = textarea.scrollTop;
  const caretPos = textarea.selectionStart;
  const front = (textarea.value).substring(0, caretPos);
  const back = (textarea.value).substring(textarea.selectionEnd, textarea.value.length);
  textarea.value = front + text + back;
  textarea.selectionStart = caretPos + text.length;
  textarea.selectionEnd = caretPos + text.length;
  textarea.focus();
  textarea.scrollTop = scrollPos;
};

export default insertAtCaret;
