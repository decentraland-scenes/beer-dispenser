import { getUserData } from '@decentraland/Identity'
import { getConnectedPlayers } from '@decentraland/Players'
import { BeerGlass } from './beerGlass'

export let players: {
  userId: string
  isCurrentPlayer: boolean
  holdingBeerGlass: boolean
  beer?: BeerGlass | undefined
}[] = []

export let thisPlayerIndex: number

getUserData().then((user) => {
  if (!user) return

  let index = undefined
  for (let i = 0; i < players.length; i++) {
    if (players[i].userId === user?.userId) {
      index = i
    }
  }
  if (index !== undefined) {
    players[index].isCurrentPlayer = true
    thisPlayerIndex = index
  } else {
    let newArrayLength = players.push({
      userId: user.userId,
      isCurrentPlayer: true,
      holdingBeerGlass: false,
      beer: undefined,
    })
    thisPlayerIndex = newArrayLength - 1
  }

  log('PLAYER ID: ', thisPlayerIndex, players[thisPlayerIndex])
})

getConnectedPlayers().then(async (connectedPlayers) => {
  connectedPlayers.forEach(async (player) => {
    players.push({
      userId: player.userId,
      isCurrentPlayer: false,
      holdingBeerGlass: false,
      beer: undefined,
    })
  })
})

onPlayerConnectedObservable.add((player) => {
  players.push({
    userId: player.userId,
    isCurrentPlayer: false,
    holdingBeerGlass: false,
  })

  log('stranger ENTERED: ', player, ' FULL LIST: ', players)
})

onPlayerDisconnectedObservable.add((player) => {
  log('USER LEFT: ', player.userId)

  let index: number | undefined = undefined
  for (let i = 0; i < players.length; i++) {
    if (players[i].userId === player.userId) {
      index = i
    }
  }
  if (index !== undefined) {
    players[index].beer?.reset()

    players.splice(index, 1)
  }
})
