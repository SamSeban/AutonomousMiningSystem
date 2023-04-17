class PriorityQueue {
  constructor() {
    this.heap = [null];
  }

  size() {
    return this.heap.length - 1;
  }

  isEmpty() {
    return this.heap.length === 1;
  }

  push(node) {
    this.heap.push(node);

    let currentIndex = this.heap.length - 1;
    let parentIndex = currentIndex >>> 1;

    while (currentIndex > 1 && this.heap[parentIndex].totalCost > this.heap[currentIndex].totalCost) {
      [this.heap[parentIndex], this.heap[currentIndex]] = [this.heap[currentIndex], this.heap[parentIndex]];
      currentIndex = parentIndex;
      parentIndex = currentIndex >>> 1;
    }
  }

  update(node) {
    let currentIndex = this.heap.indexOf(node);
    let parentIndex = currentIndex >>> 1;

    while (currentIndex > 1 && this.heap[parentIndex].totalCost > this.heap[currentIndex].totalCost) {
      [this.heap[parentIndex], this.heap[currentIndex]] = [this.heap[currentIndex], this.heap[parentIndex]];
      currentIndex = parentIndex;
      parentIndex = currentIndex >>> 1;
    }
  }

  pop() {
    const smallest = this.heap[1];
    this.heap[1] = this.heap[this.heap.length - 1];
    this.heap.splice(this.heap.length - 1);

    const size = this.heap.length - 1;

    if (size < 2) return smallest;

    const val = this.heap[1];
    let index = 1;
    let smallerChildIndex = 2;
    const cost = val.totalCost;
    do {
      let smallerChildNode = this.heap[smallerChildIndex];
      if (smallerChildIndex < size - 1) {
        const rightChildNode = this.heap[smallerChildIndex + 1];
        if (smallerChildNode.totalCost > rightChildNode.totalCost) {
          smallerChildIndex++;
          smallerChildNode = rightChildNode;
        }
      }
      if (cost <= smallerChildNode.totalCost) {
        break;
      }
      this.heap[index] = smallerChildNode;
      this.heap[smallerChildIndex] = val;
      index = smallerChildIndex;

      smallerChildIndex *= 2;
    } while (smallerChildIndex <= size);

    return smallest;
  }
}

module.exports = PriorityQueue;