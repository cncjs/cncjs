class GrblLineParserResultHelp {
  static parse(line) {
    // * Grbl v1.1
    //   [HLP:]
    const r = line.match(/^\[(?:HLP:)(.+)\]$/);
    if (!r) {
      return null;
    }

    const payload = {
      message: r[1]
    };

    return {
      type: GrblLineParserResultHelp,
      payload: payload
    };
  }
}

export default GrblLineParserResultHelp;
