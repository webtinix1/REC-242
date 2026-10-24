'use client'
import React from 'react'

export const VersionCell = ({ cellData }: { cellData?: number }) => (
  <span className="rec-mono">v{cellData || 1}</span>
)
