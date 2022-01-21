@Component('picked')
export class Picked {
  lastPos: Vector3
  player: string
  constructor(player: string, lastPos?: Vector3) {
    this.player = player
    this.lastPos = lastPos ? lastPos : Vector3.Zero()
  }
}
