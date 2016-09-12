## Usage

```js
import { Modal } from '../components';

export default () => (
    <Modal
        show={true}
        onHide={() => {
        }}
        backdrop
        closeButton
    >
        <Modal.Header>
            <Modal.Title>
            </Modal.Title>
        </Modal.Header>
        <Modal.Body padding={true}>
        </Modal.Body>
        <Modal.Footer>
            <button type="button" className="btn btn-default">Cancel</button>
            <button type="button" className="btn btn-default">OK</button>
        </Modal.Footer>
    </Modal>
)
```
