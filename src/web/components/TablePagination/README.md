## Usage

```js
<TablePagination
    type="full"
    lengthMenu=[10, 25, 50, 100]
    page={1}
    pageLength={10}
    totalRecords={1000}
    onPageChange={({ page, pageLength }) => {
    }}
    recordsText={({ totalRecords, from, to }) => {
        if (totalRecords > 0) {
            return `Records: ${from} - ${to} / ${totalRecords}`;
        }

        return `Records: ${totalRecords}`;
    }}
    pageLengthText={({ pageLength }) => {
        return `${pageLength}} per page`;
    }}
    pullRight
/>
```
