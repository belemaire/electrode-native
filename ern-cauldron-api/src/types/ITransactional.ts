export interface ITransactional {
  /**
   * Begin (start) a new transaction.
   * Will fail if a transaction is already in progress.
   */
  beginTransaction(): Promise<void>

  /**
   * Commit (completes) the in progress transaction.
   * @param message The message to associate to this completed transaction.
   */
  commitTransaction(message: string | string[]): Promise<void>

  /**
   * Discard (cancel) the in progress transaction.
   */
  discardTransaction(): Promise<void>
}
