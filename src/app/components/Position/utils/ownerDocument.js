import ReactDOM from 'react-dom';
import ownerDocument from 'dom-helpers/ownerDocument';

export default function (componentOrElement) {
  return ownerDocument(ReactDOM.findDOMNode(componentOrElement));
}
