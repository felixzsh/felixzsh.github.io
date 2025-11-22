/**
 * Formatter - Utility class for rendering markdown and formatting output
 */
export class Formatter {
  /**
   * Converts markdown text to HTML
   * @param {string} text - Markdown text to convert
   * @returns {string} HTML string
   */
  static renderMarkdown(text) {
    let html = text
      // Headers
      .replace(/^# (.*$)/gim, '<div class="md-h1">$1</div>')
      .replace(/^## (.*$)/gim, '<div class="md-h2">$1</div>')
      .replace(/^### (.*$)/gim, '<div class="md-h3">$1</div>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<span class="md-strong">$1</span>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<span class="md-em">$1</span>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<code class="md-block-code">$1</code>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<span class="md-code">$1</span>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="md-link">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<div class="md-list-item">• $1</div>')
      // Newlines to breaks (for non-block elements)
      .replace(/\n/gim, '<br>');

    return html;
  }

  /**
   * Applies color to text
   * @param {string} text - Text to colorize
   * @param {string} color - CSS color variable name (e.g., 'red', 'green')
   * @returns {string} HTML string with color applied
   */
  static colorize(text, color) {
    return `<span style="color: var(--${color})">${text}</span>`;
  }

  /**
   * Formats an error message
   * @param {string} message - Error message
   * @returns {string} Formatted HTML string
   */
  static error(message) {
    return this.colorize(message, 'red');
  }

  /**
   * Formats a success message
   * @param {string} message - Success message
   * @returns {string} Formatted HTML string
   */
  static success(message) {
    return this.colorize(message, 'green');
  }

  /**
   * Formats a warning message
   * @param {string} message - Warning message
   * @returns {string} Formatted HTML string
   */
  static warning(message) {
    return this.colorize(message, 'yellow');
  }

  /**
   * Formats info message
   * @param {string} message - Info message
   * @returns {string} Formatted HTML string
   */
  static info(message) {
    return this.colorize(message, 'blue');
  }
}
