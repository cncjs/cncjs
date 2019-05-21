class History {
    maxLength = Infinity;

    history = [];

    // A circular history array if a maximum length is given
    start = 0;

    // The start position for the history array
    index = -1; // Current index of the history array

    constructor(maxLength) {
        maxLength = Number(maxLength) || 0;
        if (maxLength > 0) {
            this.maxLength = maxLength;
        }
    }

    current() {
        if (this.history.length === 0) {
            return undefined;
        }

        const index = (this.start + this.index) % this.history.length;
        return this.history[index];
    }

    forward() {
        if ((this.history.length === 0) || (this.index + 1 >= this.history.length)) {
            return undefined;
        }

        ++this.index;
        const index = (this.start + this.index) % this.history.length;
        return this.history[index];
    }

    back() {
        if ((this.history.length === 0) || (this.index - 1 < 0)) {
            return undefined;
        }

        --this.index;
        const index = (this.start + this.index) % this.history.length;
        return this.history[index];
    }

    go(n) {
        if (this.history.length === 0) {
            return undefined;
        }
        n = Number(n) || 0;
        this.index = Math.min(Math.max(0, this.index + n), this.history.length - 1);
        const index = (this.start + this.index) % this.history.length;
        return this.history[index];
    }

    // Reset the index to the last position of the history array
    resetIndex() {
        if (this.history.length > 0) {
            this.index = this.history.length - 1;
        } else {
            this.index = -1;
        }
    }

    // 0 1 2 3 4 5 6 7 8 9      0 1 2 3 4 5 6 7 8 9
    // S x x x x x x x x x  >>  x S x x x x x x x x
    push(data) {
        if (this.history.length < this.maxLength) {
            if (this.index + 1 >= this.history.length) {
                ++this.index;
            }
            this.history.push(data);
        } else {
            this.history[this.start] = data;
            this.start = (this.start + 1) % this.history.length;
            if (this.index > 0) {
                --this.index;
            }
        }

        return data;
    }
}

export default History;
