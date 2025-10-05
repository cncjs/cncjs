class GrblLineParserResultVersion {
  static parse(line) {
    // * Grbl v1.1
    //   [VER:]
    const r = line.match(/^\[(?:VER:)(.+)\]$/);
    if (!r) {
      return null;
    }

    const payload = {
      message: r[1]
    };

    return {
      type: GrblLineParserResultVersion,
      payload: payload
    };
  }
}

export default GrblLineParserResultVersion;
