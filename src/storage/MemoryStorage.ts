import { Storage } from './Storage'

export class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>()

  async saveTest(content: string): Promise<void> {
    this.store.set('test', content)
  }

  async saveTodo(content: string): Promise<void> {
    this.store.set('todo', content)
  }

  async saveModifications(content: string): Promise<void> {
    this.store.set('modifications', content)
  }

  async saveLint(content: string): Promise<void> {
    this.store.set('lint', content)
  }

  async saveConfig(content: string): Promise<void> {
    this.store.set('config', content)
  }

  async getTest(): Promise<string | null> {
    return this.store.get('test') ?? null
  }

  async getTodo(): Promise<string | null> {
    return this.store.get('todo') ?? null
  }

  async getModifications(): Promise<string | null> {
    return this.store.get('modifications') ?? null
  }

  async getLint(): Promise<string | null> {
    return this.store.get('lint') ?? null
  }

  async getConfig(): Promise<string | null> {
    return this.store.get('config') ?? null
  }

  async saveReminderAttempt(key: string, timestamp: number): Promise<void> {
    this.store.set(`reminder_${key}`, timestamp.toString())
  }

  async getReminderAttempt(key: string): Promise<number | null> {
    const value = this.store.get(`reminder_${key}`)
    return value ? parseInt(value) : null
  }

  async clearReminderAttempt(key: string): Promise<void> {
    this.store.delete(`reminder_${key}`)
  }
}
