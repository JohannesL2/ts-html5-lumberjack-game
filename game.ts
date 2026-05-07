interface GameConfig {
    canvasWidth: number;
    canvasHeight: number;
    perfectMin: number;
    perfectMax: number;
    logSpeed: number;
}

const config: GameConfig = {
    canvasWidth: 800,
    canvasHeight: 500,
    perfectMin: 70,
    perfectMax: 85,
    logSpeed: 4
};

enum LogState {
    Incoming,
    InPosition,
    Split,
    Missed
}

const imgLumberjack = new Image();
imgLumberjack.src = "assets/transparent.png";

const imgTreeLog = new Image();
imgTreeLog.src = "assets/tree_log.png";

const imgChoppingBlock = new Image();
imgChoppingBlock.src = "assets/chopping_block.png";

const imgBackground = new Image();
imgBackground.src = "assets/background.png";

const spriteConfig = {
    frameWidth: 256,
    frameHeight: 256,
};

const logSpriteConfig = {
    frameWidth: 500,
    frameHeight: 450,
};

const choppingBlockConfig = {
    width: 90,
    height: 40
};

class Log {
    x: number;
    y: number;
    width: number = 200;
    height: number = 90;
    state: LogState = LogState.Incoming;
    splitProgress: number = 0;

    constructor(startX: number, startY: number) {
        this.x = startX;
        this.y = startY;
    }

    update() {
        if (this.state === LogState.Incoming) {
            if (this.x > 270) {
                this.x -= config.logSpeed;
            } else {
                this.x = 270;
                this.state = LogState.InPosition;
            }
        } else if (this.state === LogState.Split) {
            this.splitProgress += 7;
        } else if (this.state === LogState.Missed) {
            this.y += 6;
            this.x -= 3;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!imgTreeLog.complete) return;

        let sourceX = 0;
        let sourceY = 0;

        ctx.imageSmoothingEnabled = false;


        if (this.state === LogState.Incoming || this.state === LogState.InPosition) {
            sourceX = 0;
            sourceY = 0;

        ctx.drawImage(
            imgTreeLog,
            sourceX, sourceY,
            logSpriteConfig.frameWidth, logSpriteConfig.frameHeight,
            this.x, this.y,
            this.width, this.height
            );
        } else if (this.state === LogState.Missed) {
            sourceX = logSpriteConfig.frameWidth;
            sourceY = 0;

            ctx.drawImage(
                imgTreeLog,
                sourceX, sourceY,
                logSpriteConfig.frameWidth, logSpriteConfig.frameHeight,
                this.x, this.y,
                this.width, this.height
            );
        } else if (this.state === LogState.Split) {
            sourceX = 0;
            sourceY = logSpriteConfig.frameHeight;

            ctx.drawImage(
                imgTreeLog,
                sourceX, sourceY,
                logSpriteConfig.frameWidth / 2, logSpriteConfig.frameHeight,
                this.x - this.splitProgress, this.y,
                this.width / 2, this.height
            );
            ctx.drawImage(
                imgTreeLog,
                sourceX + logSpriteConfig.frameWidth / 2, sourceY,
                logSpriteConfig.frameWidth / 2, logSpriteConfig.frameHeight,
                this.x + this.width / 2 + this.splitProgress, this.y,
                this.width / 2, this.height
            );
        }
    }
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private currentLog: Log | null = null;
    private choppingBlockX = 310;
    private choppingBlockY = 350;
    private choppingBlockWidth = 120;
    private choppingBlockHeight = 90;
    
    private power = 0;
    private isCharging = false;
    private chargeDirection = 1;
    private chargeSpeed = 4;

    private score = 0;
    private feedbackText = "";
    private feedbackColor = "#ffffff";

    private currentFrame = 0;
    private animationTimer = 0;
    private frameDuration = 80;
    private isChopping = false;

    private btnX = 300;
    private btnY = 415;
    private btnWidth = 200;
    private btnHeight = 65;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.canvas.width = config.canvasWidth;
        this.canvas.height = config.canvasHeight;
        this.ctx = this.canvas.getContext("2d")!;

        this.ctx.imageSmoothingEnabled = false;
        (this.ctx as any).mozImageSmoothingEnabled = false;
        (this.ctx as any).webkitImageSmoothingEnabled = false;
        (this.ctx as any).msImageSmoothingEnabled = false;

        this.setupEventListeners();
        this.spawnLog();

        requestAnimationFrame(this.gameLoop);
    }

    private setPixelRendering() {
        this.ctx.imageSmoothingEnabled = false;
        (this.ctx as any).mozImageSmoothingEnabled = false;
        (this.ctx as any).webkitImageSmoothingEnabled = false;
        (this.ctx as any).msImageSmoothingEnabled = false;
    }

    private setupEventListeners() {
        window.addEventListener("keydown", (e) => {
            if (e.code === "Space" && !e.repeat) {
                this.startCharging();
            }
        });

        window.addEventListener("keyup", (e) => {
            if (e.code === "Space") {
                this.stopCharging();
            }
        });
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();

            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touchX = (touch.clientX - rect.left) * scaleX;
            const touchY = (touch.clientY - rect.top) * scaleY;

            if (touchX >= this.btnX && touchX <= this.btnX + this.btnWidth &&
                touchY >= this.btnY && touchY <= this.btnY + this.btnHeight) {
                this.startCharging();
            }
        }, { passive: false });

        this.canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            this.stopCharging();
        }, { passive: false });

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0) {
                this.handlePointerDown(e.clientX, e.clientY);
            }
    });

    window.addEventListener("mouseup", (e) => {
        this.stopCharging();
    });
}

private handlePointerDown(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const pointerX = (clientX - rect.left) * scaleX;
    const pointerY = (clientY - rect.top) * scaleY;
    
    if (pointerX >= this.btnX && pointerX <= this.btnX + this.btnWidth &&
        pointerY >= this.btnY && pointerY <= this.btnY + this.btnHeight) {
        this.startCharging();
    }
}

    private startCharging() {
        if (this.currentLog && this.currentLog.state === LogState.InPosition && !this.isChopping) {
            this.isCharging = true;
            this.power = 0;
            this.chargeDirection = 1;
            this.feedbackText = "";
        }
    }

    private stopCharging() {
        if (this.isCharging) {
            this.isCharging = false;
            this.isChopping = true;
            this.currentFrame = 0;
            this.animationTimer = performance.now();
        }
    }

    private spawnLog() {
        this.currentLog = new Log(config.canvasWidth, this.choppingBlockY - 62);
    }

    private evaluateHit() {
        if (!this.currentLog) return;

        if (this.power >= config.perfectMin && this.power <= config.perfectMax) {
            this.currentLog.state = LogState.Split;
            this.score += 1;
            this.feedbackText = "PERFECT! +1";
            this.feedbackColor = "#ffffff";
        } else {
            this.currentLog.state = LogState.Missed;
            this.feedbackText = this.power < config.perfectMin ? "Too weak!" : "Too Strong!";
            this.feedbackColor = "#ffffff";
        }

        setTimeout(() => {
            this.spawnLog();
        }, 1200);
    }

    private update(currentTime: number) {
        if (this.isCharging) {
            this.power += this.chargeSpeed * this.chargeDirection;
            if (this.power >= 100) {
                this.power = 100;
                this.chargeDirection = -1;
            } else if (this.power <= 0) {
                this.power = 0;
                this.chargeDirection = 1;
            }
        }

        if (this.isChopping) {
            if (currentTime - this.animationTimer > this.frameDuration) {
                this.currentFrame++;
                this.animationTimer = currentTime;

                if (this.currentFrame === 3) {
                    this.evaluateHit();
                }

                if (this.currentFrame >= 4) {
                    this.currentFrame = 0;
                    this.isChopping = false;
                }
            }
        }

        if (this.currentLog) {
            this.currentLog.update();
        }
    }

    private draw() {
        this.setPixelRendering();

        if (imgBackground.complete) {
            this.ctx.drawImage(imgBackground, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = "#23272a";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#2e6f40";
            this.ctx.fillRect(0, this.canvas.height - 65, this.canvas.width, this.canvas.height);
        }

        if (imgChoppingBlock.complete) {
            this.ctx.drawImage(
                imgChoppingBlock,
                this.choppingBlockX, this.choppingBlockY,
                this.choppingBlockWidth, this.choppingBlockHeight
            );
        } else {
            this.ctx.fillStyle = "#6e4720";
            this.ctx.fillRect(this.choppingBlockX, this.choppingBlockY, this.choppingBlockWidth, this.choppingBlockHeight);
        }

        if (this.currentLog) {
            this.currentLog.draw(this.ctx);
        }

        if (imgLumberjack.complete) {
            const xSource = this.currentFrame * spriteConfig.frameWidth;
            const ySource = 0;

            this.ctx.drawImage(
                imgLumberjack,
                xSource, ySource,
                spriteConfig.frameWidth, spriteConfig.frameHeight,
                140, this.choppingBlockY - 145,
                180, 180
            );
        }

        this.drawUI();
    }

    private drawUI() {
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.font = "bold 22px Arial";
        this.ctx.fillText(`Logs: ${this.score}`, 30, 45);

        if (this.feedbackText) {
            this.ctx.fillStyle = this.feedbackColor;
            this.ctx.font = "bold 28px Arial";
            this.ctx.fillText(this.feedbackText, 300, 180);
        }

        if (this.currentLog && this.currentLog.state === LogState.InPosition && !this.isCharging && !this.isChopping) {
            this.ctx.fillStyle = "#f1c40f";
            this.ctx.font = "18px Arial";
            this.ctx.fillText("HOLD AND STOP AT THE GREEN", 230, 210);
        }

        if (this.isCharging || (this.currentLog && this.currentLog.state !== LogState.InPosition)) {
            const mX = 680, mY = 120, mW = 25, mH = 250;
            const radius = 5;

            this.ctx.fillStyle = "rgba(30, 31, 34, 0.8)";
            this.ctx.beginPath();
            this.ctx.roundRect(mX, mY, mW, mH, radius);
            this.ctx.fill();
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            this.ctx.stroke();

            const perfY = mY + mH - (config.perfectMax / 100 * mH);
            const perfH = (config.perfectMax - config.perfectMin) / 100 * mH;

            const perfGrad = this.ctx.createLinearGradient(mX, perfY, mX + mW, perfY);
            perfGrad.addColorStop(0, "#2ecc71");
            perfGrad.addColorStop(1, "#27ae60");

            this.ctx.fillStyle = perfGrad;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = "#2ecc71";
            this.ctx.fillRect(mX - 2, perfY, mW + 4, perfH);
            this.ctx.shadowBlur = 0;

            const chargeH = (this.power / 100) * mH;
            const powerY = mY + mH - chargeH;

            const isInsidePerfect = this.power >= config.perfectMin && this.power <= config.perfectMax;

            const powerGrad = this.ctx.createLinearGradient(mX, powerY, mX, mY + mH);

            if (isInsidePerfect) {
            powerGrad.addColorStop(0, "#ffffff");
            powerGrad.addColorStop(1, "#f1c40f");
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "#f1c40f";
        } else {
            powerGrad.addColorStop(0, "#e74c3c");
            powerGrad.addColorStop(1, "#c0392b");
            this.ctx.shadowBlur = 0;
        }
            
            this.ctx.fillStyle = powerGrad;
            this.ctx.beginPath();
            this.ctx.roundRect(mX + 4, powerY, mW - 8, chargeH, [0, 0, radius, radius]);
            this.ctx.fill();

            if (this.isCharging) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(mX + 2, powerY);
                this.ctx.lineTo(mX + mW - 2, powerY);
                this.ctx.stroke();
            }
        }

        this.ctx.save();
        this.ctx.fillStyle = this.isCharging ? "#d35400" : "#e67e22";
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === "function") {
            this.ctx.roundRect(this.btnX, this.btnY, this.btnWidth, this.btnHeight, 15);
        } else {
            this.ctx.rect(this.btnX, this.btnY, this.btnWidth, this.btnHeight);
        }
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("CHOP!", this.btnX + this.btnWidth / 2, this.btnY + this.btnHeight / 2);
        this.ctx.restore();
    }

    private gameLoop = (currentTime: number) => {
        this.update(currentTime);
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new Game("gameCanvas");
});