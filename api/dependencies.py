from fastapi import Request, HTTPException, Depends
import time
from typing import Dict, Tuple

# Simple in-memory rate limiting stub. (Replace with Redis in production)
_RATE_LIMIT_STORE: Dict[str, Tuple[int, float]] = {}

def rate_limit(requests: int = 20, window: int = 60):
    def _rate_limit_dependency(request: Request):
        client_ip = request.client.host
        now = time.time()
        
        if client_ip in _RATE_LIMIT_STORE:
            count, start_time = _RATE_LIMIT_STORE[client_ip]
            if now - start_time > window:
                _RATE_LIMIT_STORE[client_ip] = (1, now)
            else:
                if count >= requests:
                    raise HTTPException(status_code=429, detail="Rate limit exceeded")
                _RATE_LIMIT_STORE[client_ip] = (count + 1, start_time)
        else:
            _RATE_LIMIT_STORE[client_ip] = (1, now)
            
        return True
    return _rate_limit_dependency
