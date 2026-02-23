import { Modal } from './Modal'
import { RuleForm } from './RuleForm'
import type { Rule, CreateRulePayload } from '../types'

interface Props {
  rule: Rule
  onClose: () => void
  onSubmit: (payload: CreateRulePayload) => Promise<void>
}

export function EditRuleModal({ rule, onClose, onSubmit }: Props) {
  return (
    <Modal title="Edit Firewall Rule" onClose={onClose}>
      <RuleForm
        initial={rule}
        onSubmit={async (payload) => {
          await onSubmit(payload)
          onClose()
        }}
        onCancel={onClose}
        submitLabel="Save Changes"
      />
    </Modal>
  )
}