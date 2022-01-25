import { getUserData } from '@decentraland/Identity'
import { getConnectedPlayers } from '@decentraland/Players'
import { BeerGlass } from './beerGlass'

export let currentPlayerId: string

executeTask(async () => {
  let user = await getUserData()
  if (!user) return

  currentPlayerId = user.userId
})
