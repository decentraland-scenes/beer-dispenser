import { getUserData } from '@decentraland/Identity'

export let currentPlayerId: string

executeTask(async () => {
  let user = await getUserData()
  if (!user) return

  currentPlayerId = user.userId
})
