class MarlinLineParserResultAdvancedOk {
  // Parses "ok" responses with ADVANCED_OK buffer information from Marlin firmware.
  //
  // When ADVANCED_OK is enabled, Marlin includes buffer status information in "ok" responses
  // to allow host software to send multiple commands without waiting for each acknowledgment,
  // improving communication speed.
  //
  // Response formats:
  //
  // With buffer information:
  // ```
  // ok P15 B3
  // ```
  //
  // With line number:
  // ```
  // ok N10 P15 B3
  // ```
  //
  // Parameters:
  // - N: line number being acknowledged
  // - P: planner buffer free slots (motion planner)
  // - B: command buffer free slots (G-code queue)
  //
  // Note: Not every "ok" includes P and B parameters, even with ADVANCED_OK enabled.
  static parse(line) {
    const r = line.match(/^ok(?:\s+N(\d+))?\s+P(\d+)\s+B(\d+)/i);
    if (!r) {
      return null;
    }
    const payload = {
      n: r[1] ? parseInt(r[1], 10) : undefined,
      p: parseInt(r[2], 10),
      b: parseInt(r[3], 10),
    };
    return {
      type: MarlinLineParserResultAdvancedOk,
      payload: payload,
    };
  }
}

export default MarlinLineParserResultAdvancedOk;
