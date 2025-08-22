/**
 * Advanced NoClip System
 * credits: xCult
 */

class NoClipSystem {
    constructor() {
        this.isActive = false;
        this.config = {
            baseSpeed: 2.0,
            maxSpeed: 8.0,
            acceleration: 1.025,
            fastAcceleration: 1.05,
            tickRate: 0,
            speeds: {
                slow: 0.02,
                normal: 0.2,
                fast: 1.0
            }
        };

        this.state = {
            forward: 2.0,
            strafe: 2.0,
            vertical: 2.0,
            lastUpdate: Date.now()
        };

        this.controls = {
            TOGGLE: 0x71, // F2
            FORWARD: 0x20, // W
            BACKWARD: 0x21, // S
            LEFT: 0x22, // A
            RIGHT: 0x23, // D
            UP: 0x141, // SPACE
            DOWN: 0x146, // LCtrl
            FAST: 0x18, // LMB
            SLOW: 0x19 // RMB
        };

        this.camera = null;
        this.targetEntity = null;

        this.init();
    }

    /**
     * Init NoClip
     */
    init() {
        this.bindControls();
        this.bindRender();
    }

    /**
     * Bind cotrol handlers
     */
    bindControls() {
        mp.keys.bind(this.controls.TOGGLE, true, () => {
            this.toggle();
        });
    }

    /**
     * Bind render
     */
    bindRender() {
        mp.events.add('render', () => {
            if (this.shouldUpdate()) {
                this.update();
            }
        });
    }

    /**
     * Toggle NoClip
     */
    toggle() {
        this.isActive = !this.isActive;

        if (this.isActive)  {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable NoClip
     */
    enable() {
        this.targetEntity = this.getTargetEntity();
        this.camera = mp.cameras.new('gameplay');

        if (!this.camera) {
            this.isActive = false;
            return;
        }

        if (this.targetEntity) {
            if (this.isPlayerInVehicle()) {
                this.targetEntity.freezePosition(true);
                this.targetEntity.setCollision(false, false);
            } else {
                mp.players.local.freezePosition(true);
                mp.players.local.setCollision(false, false);
             }
        }
    }

    /**
     * Disable NoClip
     */
    disable() {
        if (this.targetEntity) {
            if (this.isPlayerInVehicle()) {
                this.targetEntity.freezePosition(false);
                this.targetEntity.setCollision(true, true);
            } else {
                mp.players.local.freezePosition(false);
                mp.players.local.setCollision(true, true);

                this.setEntityToGround(mp.players.local); // Place player on ground
            }
        }

        this.resetState();
        this.targetEntity = null;
        this.camera = null;
    }

    /**
     * Check if should update
     */
    shouldUpdate() {
        return this.isActive &&
               this.camera &&
               this.targetEntity &&
               (Date.now() - this.state.lastUpdate) > this.config.tickRate;
    }

    /**
     * Main update loop
     */
    update() {
        const currentSpeed = this.getCurrentSpeed();
        const direction = this.camera.getDirection();
        const position = this.targetEntity.position;

        this.handleMovement(position, direction, currentSpeed);
        this.updateEntityPosition(position);

        this.state.lastUpdate = Date.now();
    }

    /**
     * Get current movement speed
     */
    getCurrentSpeed() {
        const controls = mp.game.controls;

        if (controls.isControlPressed(0, this.controls.FAST)) {
            return this.config.speeds.fast;
        } else if (controls.isControlPressed(0, this.controls.SLOW)) {
            return this.config.speeds.slow;
        }

        return this.config.speeds.normal;
    }

    /**
     * Handle all movement
     */
    handleMovement(position, direction, speed) {
        this.handleForwardMovement(position, direction, speed);
        this.handleStrafeMovement(position, direction, speed);
        this.handleVerticalMovement(position, speed);
    }

    /**
     * Handle forward/backward movement
     */
    handleForwardMovement(position, direction, speed) {
        const controls = mp.game.controls;

        if (controls.isControlPressed(0, this.controls.FORWARD)) {
            this.accelerateAxis('forward');
            const movement = this.state.forward * speed;
            position.x += direction.x * movement;
            position.y += direction.y * movement;
            position.z += direction.z * movement;
        } else if (controls.isControlPressed(0, this.controls.BACKWARD)) {
            this.accelerateAxis('forward');
            const movement = this.state.forward * speed;
            position.x -= direction.x * movement;
            position.y -= direction.y * movement;
            position.z -= direction.z * movement;
        } else {
            this.state.forward = this.config.baseSpeed;
        }
    }

    /**
     * Handle left/right movement
     */
    handleStrafeMovement(position, direction, speed) {
        const controls = mp.game.controls;

        const strafeDirection = {
            x: -direction.y,
            y: direction.x
        };

        if (controls.isControlPressed(0, this.controls.LEFT)) {
            this.accelerateAxis('strafe');
            const movement = this.state.strafe * speed;
            position.x += strafeDirection.x * movement;
            position.y += strafeDirection.y * movement;
        } else if (controls.isControlPressed(0, this.controls.RIGHT)) {
            this.accelerateAxis('strafe');
            const movement = this.state.strafe * speed;
            position.x -= strafeDirection.x * movement;
            position.y -= strafeDirection.y * movement;
        } else {
            this.state.strafe = this.config.baseSpeed;
        }
    }

    /**
     * Handle vertical movement
     */
    handleVerticalMovement(position, speed) {
        const controls = mp.game.controls;

        if (controls.isControlPressed(0, this.controls.UP)) {
            this.accelerateAxis('vertical');
            position.z += this.state.vertical * speed;
        } else if (controls.isControlPressed(0, this.controls.DOWN)) {
            this.accelerateAxis('vertical');
            position.z -= this.state.vertical * speed;
        } else {
            this.state.vertical = this.config.baseSpeed;
        }
    }

    /**
     * Accelerate movement on specific axis
     */
    accelerateAxis(axis) {
        if (this.state[axis] < this.config.maxSpeed) {
            this.state[axis] *= this.config.acceleration;
        }
    }

    /**
     * Update entity position
     */
    updateEntityPosition(position) {
        if (this.isPlayerInVehicle()) {
            this.targetEntity.setCoordsNoOffset(
                position.x, position.y, position.z, false, false, false
            );
        } else {
            mp.players.local.setCoordsNoOffset(
                position.x, position.y, position.z, false, false, false
            );
        }
    }

    /**
     * Get entity (Player or vehicle)
     */
    getTargetEntity() {
        if (this.isPlayerInVehicle()) {
            return mp.players.local.vehicle;
        }
        return mp.players.local;
    }

    /**
     * Check if player is in a vehicle
     */
    isPlayerInVehicle() {
        return mp.players.local.vehicle &&
               mp.players.local.vehicle.handle !== 0;
    }

    /**
     * Reset movement state
     */
    resetState() {
        this.state.forward = this.config.baseSpeed;
        this.state.strafe = this.config.baseSpeed;
        this.state.vertical = this.config.baseSpeed;
    }

    /**
     * Set entity to ground
     */
    setEntityToGround(entity) {
        if (!entity || !entity.position) return;
        
        const position = entity.position;
        const groundZ = mp.game.gameplay.getGroundZFor3dCoord(
            position.x, position.y, position.z, 0.0, false
        );

        entity.setCoordsNoOffset(
            position.x, position.y, groundZ, false, false, false
        );
    }

    /**
     * Get current status info
     */
    getStatus() {
        return {
            active: this.isActive,
            inVehicle: this.isPlayerInVehicle(),
            target: this.isPlayerInVehicle() ? 'vehicle' : 'player',
            speed: {
                forward: this.state.forward.toFixed(2),
                strafe: this.state.strafe.toFixed(2),
                vertical: this.state.vertical.toFixed(2)
            }
        };
    }

    /**
     * Destroy
     */
    destroy() {
        if (this.isActive) {
            this.disable();
        }
    }
}

// Init NoClip
const noClipSystem = new NoClipSystem();