import { getUserData } from '@decentraland/Identity'

export let currentPlayerId: string

void executeTask(async () => {
  const user = await getUserData()
  if (!user) return

  currentPlayerId = user.userId
})
