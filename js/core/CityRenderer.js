/**
 * CityRenderer - Handles procedural rendering of cities based on faction
 */

export class CityRenderer {
    constructor() {
        this.factions = ['human', 'orc', 'elf', 'undead', 'neutral'];
    }

    /**
     * Draw a city on the given context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Size of the city (hexSize)
     * @param {string} faction - Faction ID (human, orc, etc)
     * @param {string} ownerColor - Color of the owner
     * @param {number} level - City level (1-3) influences complexity
     */
    drawCity(ctx, x, y, size, faction, ownerColor, level = 1) {
        ctx.save();
        ctx.translate(x, y);

        // Scale based on level slightly?
        const scale = 0.8 + (level * 0.1);
        ctx.scale(scale, scale);

        // Map faction to known styles or default to neutral
        let style = faction ? faction.toLowerCase() : 'neutral';

        // Aliases/Mapping
        if (style === 'demons') style = 'undead';
        if (style === 'dwarves') style = 'human';
        if (style === 'giants') style = 'orc';

        if (!this.factions.includes(style)) style = 'neutral';

        switch (style) {
            case 'human':
                this.drawHumanCity(ctx, size, ownerColor);
                break;
            case 'orc':
                this.drawOrcCity(ctx, size, ownerColor);
                break;
            case 'elf':
                this.drawElfCity(ctx, size, ownerColor);
                break;
            case 'undead':
                this.drawUndeadCity(ctx, size, ownerColor);
                break;
            default:
                this.drawNeutralCity(ctx, size, ownerColor);
        }

        // Draw Flag/Banner with owner color
        if (ownerColor) {
            this.drawFlag(ctx, size, ownerColor);
        }

        ctx.restore();
    }

    drawHumanCity(ctx, size, color) {
        const w = size * 0.6;
        const h = size * 0.5;

        // Base Keep
        ctx.fillStyle = '#C0C0C0'; // Grey stone
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;

        // Main block
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Battlements (Crenellations)
        const dentSize = w / 5;
        ctx.fillStyle = '#A9A9A9';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-w / 2 + (i * dentSize * 2), -h / 2 - dentSize, dentSize, dentSize);
            ctx.strokeRect(-w / 2 + (i * dentSize * 2), -h / 2 - dentSize, dentSize, dentSize);
        }

        // Gate
        ctx.fillStyle = '#4A3B2A'; // Dark wood
        ctx.beginPath();
        ctx.arc(0, h / 2, w / 4, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
    }

    drawOrcCity(ctx, size, color) {
        const w = size * 0.5;

        // Spiky rough tower
        ctx.fillStyle = '#5D4037'; // Mud/Wood
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-w / 2, size / 3); // Bottom left
        ctx.lineTo(-w / 3, -size / 3); // Top left (tapered)
        ctx.lineTo(0, -size / 2);    // Spike tip
        ctx.lineTo(w / 3, -size / 3);  // Top right
        ctx.lineTo(w / 2, size / 3);   // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Spikes
        ctx.fillStyle = '#CFD8DC'; // Metal/Bone
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 1.5, -w / 4); ctx.lineTo(-w / 2.5, 0);
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 1.5, -w / 4); ctx.lineTo(w / 2.5, 0);
        ctx.fill();
    }

    drawElfCity(ctx, size, color) {
        const w = size * 0.4;

        // Tall white spire
        ctx.fillStyle = '#F5F5F5'; // White marble
        ctx.strokeStyle = '#DDD';

        ctx.beginPath();
        ctx.moveTo(-w / 2, size / 3);
        ctx.quadraticCurveTo(0, -size / 1.5, w / 2, size / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gem/Light at top or GOLD trim
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.beginPath();
        ctx.arc(0, -size / 3, w / 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawUndeadCity(ctx, size, color) {
        const w = size * 0.5;

        // Dark ruined tower
        ctx.fillStyle = '#212121'; // Dark grey
        ctx.strokeStyle = '#000';

        ctx.beginPath();
        ctx.moveTo(-w / 2, size / 3);
        ctx.lineTo(-w / 2, -size / 4);
        ctx.lineTo(0, -size / 2); // Broken top
        ctx.lineTo(w / 4, -size / 3);
        ctx.lineTo(w / 2, size / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Green glow/windows
        ctx.fillStyle = '#76FF03'; // Necrotic green
        ctx.shadowColor = '#76FF03';
        ctx.shadowBlur = 5;
        ctx.fillRect(-w / 6, 0, w / 3, w / 2);
        ctx.shadowBlur = 0;
    }

    drawNeutralCity(ctx, size, color) {
        this.drawHumanCity(ctx, size, color); // Re-use human as generic
    }

    drawFlag(ctx, size, color) {
        // Simple flag on top right
        ctx.beginPath();
        ctx.moveTo(size / 4, -size / 4);
        ctx.lineTo(size / 4, -size / 2);
        ctx.lineTo(size / 2, -size / 3); // Triangle flag
        ctx.lineTo(size / 4, -size / 3);
        ctx.fillStyle = color;
        ctx.fill();

        // Pole
        ctx.beginPath();
        ctx.moveTo(size / 4, -size / 4);
        ctx.lineTo(size / 4, -size / 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
