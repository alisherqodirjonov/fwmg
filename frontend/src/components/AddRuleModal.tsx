import { Modal } from './Modal'
import { RuleForm } from './RuleForm'
import type { CreateRulePayload } from '../types'

interface Props {
  onClose: () => void
  onSubmit: (payload: CreateRulePayload) => Promise<void>
}

export function AddRuleModal({ onClose, onSubmit }: Props) {
  return (
    <Modal title="Add Firewall Rule" onClose={onClose}>
      <RuleForm
        onSubmit={async (payload) => {
          await onSubmit(payload)
          onClose()
        }}
        onCancel={onClose}
        submitLabel="Add Rule"
      />
    </Modal>
  )
}