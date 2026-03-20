FROM node:18-bullseye

# Install TeX packages so pdflatex compilation works in production.
RUN apt-get update && apt-get install -y --no-install-recommends \
  texlive-latex-base \
  texlive-fonts-recommended \
  texlive-latex-extra \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Monorepo-friendly: this Dockerfile is expected to be built from repo root context.
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend ./backend

WORKDIR /app/backend
ENV NODE_ENV=production

CMD ["npm", "start"]
