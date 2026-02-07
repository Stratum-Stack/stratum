export interface QuerySpecPort {
  toQuery<T>(): T
}

export interface QuerySpecExecutorPort {
  query<T>(spec: QuerySpecPort): Promise<T>
}
