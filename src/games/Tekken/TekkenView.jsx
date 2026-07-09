import { ARENA_WIDTH, actionClass } from './tekkenLogic.js'

export default function TekkenView({ fight, p1Wins, p2Wins, resultOverlay }) {
  return (
    <>
      <div className="tekken-hud">
        <div className="tekken-health-block">
          <div className="tekken-name">P1 ({p1Wins}승)</div>
          <div className="tekken-health-bar">
            <div
              className={'tekken-health-fill' + (fight.p1.health <= 25 ? ' low' : '')}
              style={{ width: `${fight.p1.health}%` }}
            />
          </div>
        </div>
        <div className="tekken-timer">{fight.roundTime}</div>
        <div className="tekken-health-block right">
          <div className="tekken-name">P2 ({p2Wins}승)</div>
          <div className="tekken-health-bar">
            <div
              className={'tekken-health-fill' + (fight.p2.health <= 25 ? ' low' : '')}
              style={{ width: `${fight.p2.health}%` }}
            />
          </div>
        </div>
      </div>

      <div className="tekken-arena-wrap">
        <div className="tekken-arena" style={{ width: `${ARENA_WIDTH}px` }}>
          <div
            className="tekken-fighter"
            style={{
              left: `${fight.p1.x}px`,
              bottom: `${20 - fight.p1.y}px`,
              transform: `translateX(-50%) scaleX(${fight.p1.facing})`,
              '--facing': fight.p1.facing,
            }}
          >
            <div className={`fighter-sprite p1 ${actionClass(fight.p1)}`}>
              <div className="f-head" />
              <div className="f-body" />
              <div className="f-arm back" />
              <div className="f-arm front" />
              <div className="f-leg back" />
              <div className="f-leg front" />
            </div>
          </div>
          <div
            className="tekken-fighter"
            style={{
              left: `${fight.p2.x}px`,
              bottom: `${20 - fight.p2.y}px`,
              transform: `translateX(-50%) scaleX(${fight.p2.facing})`,
              '--facing': fight.p2.facing,
            }}
          >
            <div className={`fighter-sprite p2 ${actionClass(fight.p2)}`}>
              <div className="f-head" />
              <div className="f-body" />
              <div className="f-arm back" />
              <div className="f-arm front" />
              <div className="f-leg back" />
              <div className="f-leg front" />
            </div>
          </div>

          {resultOverlay}
        </div>
      </div>
    </>
  )
}
