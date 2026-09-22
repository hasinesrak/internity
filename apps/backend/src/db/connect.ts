import mongoose from "mongoose"

export async function connectDb(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  return mongoose
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState === 0) return
  await mongoose.disconnect()
}

export function databaseTarget(uri: string): string {
  try {
    const parsed = new URL(uri)
    const port = parsed.port || "27017"
    const name = parsed.pathname.replace(/^\//, "") || "(default)"
    return `${parsed.hostname}:${port}/${name}`
  } catch {
    return "the configured database"
  }
}
