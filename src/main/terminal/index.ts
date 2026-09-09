export { TerminalManager, type TerminalEventSink } from './TerminalManager'
export {
  type SessionContext,
  type SessionFactory,
  type SessionFactoryRegistry,
  type SessionHooks,
  type TerminalSession
} from './TerminalSession'
export { createDefaultSessionFactories } from './sessionFactories'
export { ScriptRunner, type ScriptTarget } from './ScriptRunner'
export { createVariableResolver, type VariableResolver } from './variableResolver'
export { systemShells, listShells, resolveShell, type ShellSource } from './shells'
