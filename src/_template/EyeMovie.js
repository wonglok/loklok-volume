export class EyeMovie {
  constructor(mini) {
    this.mini = mini;

    this.promise = this.setup();
  }
  async setup() {
    return this;
  }
}
