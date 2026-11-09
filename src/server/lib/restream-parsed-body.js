import connectRestreamer from 'connect-restreamer';

// https://github.com/dominictarr/connect-restreamer
//
// A body-parser middleware consumes the request stream, so a later reader — a
// proxying handler, for example — would see an empty request. connect-restreamer
// re-emits the parsed body as a stream to make it readable again.
//
// Re-streaming only makes sense for a body that a parser actually consumed, and
// `req._body` is what records that: body-parser sets it in `read()`, and
// connect-multiparty sets it when it handles a multipart request. For a request
// they left unread — an octet-stream upload to the watch directory — `req.body`
// is the empty object the parsers created, and re-emitting it appends a literal
// `{}` to a live stream and ends that stream early. The uploaded file then
// picks up two bytes of JSON, and whatever reads the request stream never
// finishes, so the upload never completes. An unparsed request is already a
// stream, so it is passed through as it is.
const restreamParsedBody = () => {
  const restream = connectRestreamer();

  return (req, res, next) => {
    if (!req._body) {
      next();
      return;
    }

    restream(req, res, next);
  };
};

export default restreamParsedBody;
