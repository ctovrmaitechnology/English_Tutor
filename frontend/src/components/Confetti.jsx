import React, { useEffect, useRef } from 'react';

export default function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions to cover full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Confetti Particle Class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        // Start above the screen
        this.y = Math.random() * -canvas.height - 20;
        this.sizeWidth = Math.random() * 8 + 8;
        this.sizeHeight = Math.random() * 4 + 4;
        
        // Vibrant, high-contrast colors
        const colors = [
          '#FF3E6C', '#FFD13B', '#38EF7D', '#00F2FE', 
          '#9B51E0', '#FF8E53', '#00C9FF', '#FF0844'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 3 + 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 6 - 3;
        this.wobble = Math.random() * 10;
        this.wobbleSpeed = Math.random() * 0.05 + 0.02;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.wobble) * 1.5;
        this.rotation += this.rotationSpeed;
        this.wobble += this.wobbleSpeed;

        // Reset particle to top if it falls off screen bottom
        if (this.y > canvas.height) {
          this.y = Math.random() * -100 - 20;
          this.x = Math.random() * canvas.width;
          this.speedY = Math.random() * 3 + 4;
          this.wobble = Math.random() * 10;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.sizeWidth / 2, -this.sizeHeight / 2, this.sizeWidth, this.sizeHeight);
        ctx.restore();
      }
    }

    // Initialize 160 particles for premium, dense effect
    const particles = Array.from({ length: 160 }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 100000,
      }}
    />
  );
}
