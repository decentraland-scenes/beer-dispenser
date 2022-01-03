import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { Player } from '../player'
import { playersCarryingBeer, thisPlayer } from './trackPlayers'
import { sceneMessageBus } from 'src/messageBus'

// Track player's state
export enum BeerBaseState {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen',
}

// Multiplayer
type BeerGlassState = {
  id: number
  position: Vector3
  beerState: BeerBaseState
  carryingPlayer: string
}

// Sound
const pickUpSound = new Sound(new AudioClip('sounds/pickUp.mp3'))
const putDownSound = new Sound(new AudioClip('sounds/putDown.mp3'))
const swallowSound = new Sound(new AudioClip('sounds/swallow.mp3'))

export class BeerGlass extends Entity {
  public isFull: boolean = false
  public beerBaseState: BeerBaseState = BeerBaseState.NONE
  public lastPos: Vector3
  public glass: Entity

  constructor(
    public id: number,
    model: GLTFShape,
    position: Vector3,
    public holdPosition: Vector3,
    public rotatePosition: number
  ) {
    super()
    engine.addEntity(this)

    this.glass = new Entity()

    this.glass.addComponent(model)
    this.glass.addComponent(new Transform({ position: position }))
    engine.addEntity(this.glass)
    this.glass.setParent(this)
    this.lastPos = position

    this.glass.addComponent(new Animator())
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('Blank', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourRed', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourYellow', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourGreen', { looping: false }))
    this.glass.getComponent(Animator).getClip('Blank').play()

    this.glass.addComponent(
      new OnPointerDown(
        () => {
          if (!Player.holdingBeerGlass) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: id,
              position: this.holdPosition,
              carryingPlayer: thisPlayer,
            })
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )
  }

  playPourAnim() {
    sceneMessageBus.emit('BeerGlassPourAnim', {
      id: this.id,
      position: this.holdPosition,
    })
  }

  stopAnimations() {
    this.glass.getComponent(Animator).getClip('Blank').stop()
    this.glass.getComponent(Animator).getClip('PourRed').stop()
    this.glass.getComponent(Animator).getClip('PourYellow').stop()
    this.glass.getComponent(Animator).getClip('PourGreen').stop()
  }

  public pickup(id: number, playerId?: string): void {
    this.lastPos = this.glass.getComponent(Transform).position.clone()
    this.beerBaseState = BeerBaseState.NONE
    this.setParent(null)
    if (this.hasComponent(AttachToAvatar)) {
      this.removeComponent(AttachToAvatar)
    }

    pickUpSound.getComponent(AudioSource).playOnce()

    if (playerId && playerId !== thisPlayer) {
      log('PICKING UP FOR ', playerId)
      this.addComponentOrReplace(
        new AttachToAvatar({
          avatarId: playerId,
          anchorPointId: AttachToAvatarAnchorPointId.NameTag,
        })
      )

      let index: number | undefined = undefined
      for (let i = 0; i < playersCarryingBeer.length; i++) {
        if (playersCarryingBeer[i].id === playerId) {
          index = i
        }
      }
      if (index) {
        playersCarryingBeer[index].beer = this
      } else {
        playersCarryingBeer.push({
          id: playerId,
          beer: this,
        })
      }
    } else {
      log('PICKING UP FOR ME', playerId)
      this.setParent(Attachable.FIRST_PERSON_CAMERA)

      this.addComponentOrReplace(
        new utils.Delay(100, () => {
          Player.holdingBeerGlass = true
        })
      )
    }
    this.glass.getComponent(Transform).position = this.holdPosition.clone()
    this.glass
      .getComponent(Transform)
      .rotate(Vector3.Right(), this.rotatePosition)
  }

  putDown(
    id: number,
    placePosition: Vector3,
    beerBaseState?: BeerBaseState,
    playerId?: string
  ): void {
    this.setParent(null)
    if (this.hasComponent(AttachToAvatar)) {
      this.removeComponent(AttachToAvatar)
    }
    putDownSound.getComponent(AudioSource).playOnce()
    Player.holdingBeerGlass = false

    if (beerBaseState) {
      this.beerBaseState = beerBaseState
    }

    this.glass.getComponent(Transform).position = placePosition
    this.glass.getComponent(Transform).rotation = Quaternion.Zero()
    // sceneMessageBus.emit('BeerGlassPutDown', {
    //   id: id,
    //   position: placePosition,
    //   beerState: beerBaseState,
    // })

    if (playerId) {
      let index: number | undefined = undefined
      for (let i = 0; i < playersCarryingBeer.length; i++) {
        if (playersCarryingBeer[i].id === playerId) {
          index = i
        }
      }
      if (index) {
        playersCarryingBeer[index].beer = undefined
      }
    }
  }

  drink(id: number): void {
    swallowSound.getComponent(AudioSource).playOnce()
    sceneMessageBus.emit('BeerGlassDrink', { id: id })
  }

  reset() {
    this.setParent(null)
    this.glass.getComponent(Transform).position = this.lastPos
    this.beerBaseState = BeerBaseState.NONE
    this.isFull = false
  }

  addPointerDown() {
    this.glass.addComponent(
      new OnPointerDown(
        () => {
          if (!Player.holdingBeerGlass) {
            this.pickup(this.id)
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )
  }
}

sceneMessageBus.on('BeerGlassPickedUp', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].pickup(
    beerGlassState.id,
    beerGlassState.carryingPlayer
  )

  //   beerGlasses[beerGlassState.id]
  //     .getComponent(Transform)
  //     .position.set(
  //       beerGlassState.position.x,
  //       beerGlassState.position.y,
  //       beerGlassState.position.z
  //     )
  //   beerGlasses[beerGlassState.id].beerBaseState = BeerBaseState.NONE
})

sceneMessageBus.on('BeerGlassPutDown', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].putDown(
    beerGlassState.id,
    beerGlassState.position,
    beerGlassState.beerState,
    beerGlassState.carryingPlayer
  )

  //   beerGlasses[beerGlassState.id].beerBaseState = beerGlassState.beerState
  //   beerGlasses[beerGlassState.id]
  //     .getComponent(Transform)
  //     .rotation.set(0, 0, 0, 1)
  //   beerGlasses[beerGlassState.id]
  //     .getComponent(Transform)
  //     .position.set(
  //       beerGlassState.position.x,
  //       beerGlassState.position.y,
  //       beerGlassState.position.z
  //     )
})

sceneMessageBus.on('BeerGlassDrink', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].isFull = false
  beerGlasses[beerGlassState.id].stopAnimations()
  beerGlasses[beerGlassState.id].glass
    .getComponent(Animator)
    .getClip('Blank')
    .play()
})

sceneMessageBus.on('BeerGlassPourAnim', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].isFull = true
  beerGlasses[beerGlassState.id].stopAnimations()
  beerGlasses[beerGlassState.id].glass
    .getComponent(Animator)
    .getClip(beerGlasses[beerGlassState.id].beerBaseState)
    .play()
  beerGlasses[beerGlassState.id].glass.removeComponent(OnPointerDown)
  beerGlasses[beerGlassState.id].addComponent(
    new utils.Delay(2500, () => {
      beerGlasses[beerGlassState.id].addPointerDown()
    })
  )
})

// Beer glasses
const beerGlassShape = new GLTFShape('models/beerGlass.glb')

// NOTE: We're matching the beer object's position in the array with the id - this is not good
const beerGlass1 = new BeerGlass(
  0,
  beerGlassShape,
  new Vector3(8.3, 1.25, 8),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass2 = new BeerGlass(
  1,
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass3 = new BeerGlass(
  2,
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass4 = new BeerGlass(
  3,
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass5 = new BeerGlass(
  4,
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass6 = new BeerGlass(
  5,
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass7 = new BeerGlass(
  6,
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass8 = new BeerGlass(
  7,
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass9 = new BeerGlass(
  8,
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass10 = new BeerGlass(
  9,
  beerGlassShape,
  new Vector3(1.8, 0.8, 2.3),
  new Vector3(0, -0.4, 0.5),
  -10
)

export const beerGlasses: BeerGlass[] = [
  beerGlass1,
  beerGlass2,
  beerGlass3,
  beerGlass4,
  beerGlass5,
  beerGlass6,
  beerGlass7,
  beerGlass8,
  beerGlass9,
  beerGlass10,
]
