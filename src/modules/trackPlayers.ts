import { getUserData } from '@decentraland/Identity'
import { getConnectedPlayers } from '@decentraland/Players'
import { BeerGlass } from './beerGlass'

export let playersCarryingBeer: { id: string; beer?: BeerGlass | undefined }[] =
  []

export let thisPlayer: string | undefined

getUserData().then((user) => {
  thisPlayer = user?.userId
})

// getConnectedPlayers().then(async (players) => {
//   players.forEach(async (player) => {
//     playersCarryingBeer.push({ id: player.userId, beer: undefined })
//   })
// })

onEnterSceneObservable.add((player) => {
  playersCarryingBeer.push({ id: player.userId })

  log('stranger ENTERED: ', player, ' FULL LIST: ', playersCarryingBeer)
})

onLeaveSceneObservable.add((player) => {
  log('USER LEFT: ', player.userId)

  let index: number | undefined = undefined
  for (let i = 0; i < playersCarryingBeer.length; i++) {
    if (playersCarryingBeer[i].id === player.userId) {
      index = i
    }
  }
  if (index) {
    playersCarryingBeer[index].beer?.reset()

    playersCarryingBeer.splice(index, 1)
  }
})
