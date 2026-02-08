class MarlinLineParserResultOk {
  // ok
  static parse(line) {
    //Fix issues on latest marlin where responses can look like:
    //M105
    //ok T:0
    //S_XYZ:0 
    //ok P15 B3
    const r = line.match(/^ok(\s|$)/i);
    if (!r) {
      return null;
    }

    const payload = {};

    return {
      type: MarlinLineParserResultOk,
      payload: payload
    };
  }
}

export default MarlinLineParserResultOk;
