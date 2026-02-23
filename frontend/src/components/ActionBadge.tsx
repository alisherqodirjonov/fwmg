import type { Action } from '../types'

interface Props {
  action: Action
}

const classMap: Record<Action, string> = {
  ACCEPT: 'badge-accept',
  DROP: 'badge-drop',
  REJECT: 'badge-reject',
  LOG: 'badge-log',
}

export function ActionBadge({ action }: Props) {
  return <span className={classMap[action] ?? 'badge'}>{action}</span>
}