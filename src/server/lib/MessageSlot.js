class MessageSlot {
  constructor() {
    this.value = null;
  }

  // Stores a value in the holder.
  put(value) {
    this.value = value;
  }

  // Retrieves and clears the current value, or returns the default if no value is set.
  take(defaultValue = null) {
    const value = this.value ?? defaultValue;
    this.value = null;
    return value;
  }
}

export default MessageSlot;
