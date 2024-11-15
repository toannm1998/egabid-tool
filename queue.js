class NumberQueue {
    constructor() {
        this.queue = [];
    }

    getData(){
        return this.queue;
    }

    // Thêm một số vào hàng đợi
    enqueue(number) {
        this.queue.push(number);
    }

    includes(number){
        return this.queue.includes(number)
    }

    // Lấy và loại bỏ một số ra khỏi hàng đợi
    dequeue() {
        if (this.isEmpty()) {
            // console.log('Hàng đợi rỗng!');
            return null;
        }
        return this.queue.shift();
    }

    // Kiểm tra hàng đợi có rỗng không
    isEmpty() {
        return this.queue.length === 0;
    }

    // Lấy số phần tử trong hàng đợi
    size() {
        return this.queue.length;
    }

    // Xem phần tử đầu tiên trong hàng đợi mà không loại bỏ
    peek() {
        if (this.isEmpty()) {
            console.log('Hàng đợi rỗng!');
            return null;
        }
        return this.queue[0];
    }
}

module.exports = NumberQueue;


