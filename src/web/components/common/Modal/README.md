## Usage

```js
import { Modal } from '../components';

export default () => (
    <Modal
        backdrop
        show={true}
        onHide={() => {
        }}
    >
        <Modal.Header
            closeButton
        >
            <Modal.Title>
            </Modal.Title>
        </Modal.Header>
        <Modal.Body>
        </Modal.Body>
        <Modal.Footer>
            <button type="button" className="btn btn-default">Cancel</button>
            <button type="button" className="btn btn-default">OK</button>
        </Modal.Footer>
    </Modal>
)
```
