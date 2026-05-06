"use strict";
const config = {
    canvasWidth: 800,
    canvasHeight: 500,
    perfectMin: 70,
    perfectMax: 85,
    logSpeed: 4
};
var LogState;
(function (LogState) {
    LogState[LogState["Incoming"] = 0] = "Incoming";
    LogState[LogState["InPosition"] = 1] = "InPosition";
    LogState[LogState["Split"] = 2] = "Split";
    LogState[LogState["Missed"] = 3] = "Missed";
})(LogState || (LogState = {}));
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
    constructor(startX, startY) {
        this.width = 200;
        this.height = 90;
        this.state = LogState.Incoming;
        this.splitProgress = 0;
        this.x = startX;
        this.y = startY;
    }
    update() {
        if (this.state === LogState.Incoming) {
            if (this.x > 270) {
                this.x -= config.logSpeed;
            }
            else {
                this.x = 270;
                this.state = LogState.InPosition;
            }
        }
        else if (this.state === LogState.Split) {
            this.splitProgress += 7;
        }
        else if (this.state === LogState.Missed) {
            this.y += 6;
            this.x -= 3;
        }
    }
    draw(ctx) {
        if (!imgTreeLog.complete)
            return;
        let sourceX = 0;
        let sourceY = 0;
        ctx.imageSmoothingEnabled = false;
        if (this.state === LogState.Incoming || this.state === LogState.InPosition) {
            sourceX = 0;
            sourceY = 0;
            ctx.drawImage(imgTreeLog, sourceX, sourceY, logSpriteConfig.frameWidth, logSpriteConfig.frameHeight, this.x, this.y, this.width, this.height);
        }
        else if (this.state === LogState.Missed) {
            sourceX = logSpriteConfig.frameWidth;
            sourceY = 0;
            ctx.drawImage(imgTreeLog, sourceX, sourceY, logSpriteConfig.frameWidth, logSpriteConfig.frameHeight, this.x, this.y, this.width, this.height);
        }
        else if (this.state === LogState.Split) {
            sourceX = 0;
            sourceY = logSpriteConfig.frameHeight;
            ctx.drawImage(imgTreeLog, sourceX, sourceY, logSpriteConfig.frameWidth / 2, logSpriteConfig.frameHeight, this.x - this.splitProgress, this.y, this.width / 2, this.height);
            ctx.drawImage(imgTreeLog, sourceX + logSpriteConfig.frameWidth / 2, sourceY, logSpriteConfig.frameWidth / 2, logSpriteConfig.frameHeight, this.x + this.width / 2 + this.splitProgress, this.y, this.width / 2, this.height);
        }
    }
}
class Game {
    constructor(canvasId) {
        this.currentLog = null;
        this.choppingBlockX = 310;
        this.choppingBlockY = 350;
        this.choppingBlockWidth = 120;
        this.choppingBlockHeight = 90;
        this.power = 0;
        this.isCharging = false;
        this.chargeDirection = 1;
        this.chargeSpeed = 4;
        this.score = 0;
        this.feedbackText = "";
        this.feedbackColor = "#ffffff";
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.frameDuration = 80;
        this.isChopping = false;
        this.btnX = 300;
        this.btnY = 415;
        this.btnWidth = 200;
        this.btnHeight = 65;
        this.gameLoop = (currentTime) => {
            this.update(currentTime);
            this.draw();
            requestAnimationFrame(this.gameLoop);
        };
        this.canvas = document.getElementById(canvasId);
        this.canvas.width = config.canvasWidth;
        this.canvas.height = config.canvasHeight;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.setupEventListeners();
        this.spawnLog();
        requestAnimationFrame(this.gameLoop);
    }
    setPixelRendering() {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }
    setupEventListeners() {
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
    handlePointerDown(clientX, clientY) {
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
    startCharging() {
        if (this.currentLog && this.currentLog.state === LogState.InPosition && !this.isChopping) {
            this.isCharging = true;
            this.power = 0;
            this.chargeDirection = 1;
            this.feedbackText = "";
        }
    }
    stopCharging() {
        if (this.isCharging) {
            this.isCharging = false;
            this.isChopping = true;
            this.currentFrame = 0;
            this.animationTimer = performance.now();
        }
    }
    spawnLog() {
        this.currentLog = new Log(config.canvasWidth, this.choppingBlockY - 62);
    }
    evaluateHit() {
        if (!this.currentLog)
            return;
        if (this.power >= config.perfectMin && this.power <= config.perfectMax) {
            this.currentLog.state = LogState.Split;
            this.score += 1;
            this.feedbackText = "PERFECT! +1";
            this.feedbackColor = "#ffffff";
        }
        else {
            this.currentLog.state = LogState.Missed;
            this.feedbackText = this.power < config.perfectMin ? "Too weak!" : "Too Strong!";
            this.feedbackColor = "#ffffff";
        }
        setTimeout(() => {
            this.spawnLog();
        }, 1200);
    }
    update(currentTime) {
        if (this.isCharging) {
            this.power += this.chargeSpeed * this.chargeDirection;
            if (this.power >= 100) {
                this.power = 100;
                this.chargeDirection = -1;
            }
            else if (this.power <= 0) {
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
    draw() {
        this.setPixelRendering();
        if (imgBackground.complete) {
            this.ctx.drawImage(imgBackground, 0, 0, this.canvas.width, this.canvas.height);
        }
        else {
            this.ctx.fillStyle = "#23272a";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#2e6f40";
            this.ctx.fillRect(0, this.canvas.height - 65, this.canvas.width, this.canvas.height);
        }
        if (imgChoppingBlock.complete) {
            this.ctx.drawImage(imgChoppingBlock, this.choppingBlockX, this.choppingBlockY, this.choppingBlockWidth, this.choppingBlockHeight);
        }
        else {
            this.ctx.fillStyle = "#6e4720";
            this.ctx.fillRect(this.choppingBlockX, this.choppingBlockY, this.choppingBlockWidth, this.choppingBlockHeight);
        }
        if (this.currentLog) {
            this.currentLog.draw(this.ctx);
        }
        if (imgLumberjack.complete) {
            const xSource = this.currentFrame * spriteConfig.frameWidth;
            const ySource = 0;
            this.ctx.drawImage(imgLumberjack, xSource, ySource, spriteConfig.frameWidth, spriteConfig.frameHeight, 140, this.choppingBlockY - 145, 180, 180);
        }
        this.drawUI();
    }
    drawUI() {
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
            const mX = 680, mY = 120, mW = 35, mH = 250;
            this.ctx.fillStyle = "#1e1f22";
            this.ctx.fillRect(mX, mY, mW, mH);
            const perfY = mY + mH - (config.perfectMax / 100 * mH);
            const perfH = (config.perfectMax - config.perfectMin) / 100 * mH;
            this.ctx.fillStyle = "#2ecc71";
            this.ctx.fillRect(mX, perfY, mW, perfH);
            const chargeH = (this.power / 100) * mH;
            this.ctx.fillStyle = "#e74c3c";
            this.ctx.fillRect(mX + 4, mY + mH - chargeH, mW - 8, chargeH);
        }
        this.ctx.save();
        this.ctx.fillStyle = this.isCharging ? "#d35400" : "#e67e22";
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === "function") {
            this.ctx.roundRect(this.btnX, this.btnY, this.btnWidth, this.btnHeight, 15);
        }
        else {
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
}
window.addEventListener("DOMContentLoaded", () => {
    new Game("gameCanvas");
});
