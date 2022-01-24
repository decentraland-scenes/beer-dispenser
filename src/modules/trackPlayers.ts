import { getUserData } from '@decentraland/Identity'
import { getConnectedPlayers } from '@decentraland/Players'
import { BeerGlass } from './beerGlass'

// export let players: {
//   userId: string
//   isCurrentPlayer: boolean
//   holdingBeerGlass: boolean
//   beer?: BeerGlass | undefined
// }[] = []

// export let thisPlayerIndex: number

export let currentPlayerId: string

executeTask(async () => {
  // register current player
  let user = await getUserData()
  if (!user) return

  //   players.push({
  //     userId: user.userId,
  //     isCurrentPlayer: true,
  //     holdingBeerGlass: false,
  //     beer: undefined,
  //   })
  //   thisPlayerIndex = 0
  currentPlayerId = user.userId

  //let connectedPlayers = await getConnectedPlayers()

  // register currently connected players
  //   connectedPlayers.forEach(async (player) => {
  //     players.push({
  //       userId: player.userId,
  //       isCurrentPlayer: false,
  //       holdingBeerGlass: false,
  //       beer: undefined,
  //     })
})

// register players who come in later
//   onPlayerConnectedObservable.add((player) => {
//     players.push({
//       userId: player.userId,
//       isCurrentPlayer: false,
//       holdingBeerGlass: false,
//     })

//     log('stranger ENTERED: ', player, ' FULL LIST: ', players)
//   })

//   // remove players that leave
//   onPlayerDisconnectedObservable.add((player) => {
//     let index: number | undefined = undefined
//     for (let i = 0; i < players.length; i++) {
//       if (players[i].userId === player.userId) {
//         index = i
//       }
//     }
//     if (index !== undefined) {
//       players[index].beer?.reset()

//       players.splice(index, 1)
//     }
//     log('USER LEFT: ', player.userId)
//   })
// })
