export const CAULDRON_CURRENT_CHANGED = 'CAULDRON_CURRENT_CHANGED'

export const cauldronCurrentChanged = repoName => ({
  payload: repoName,
  type: CAULDRON_CURRENT_CHANGED,
})
