#About Chrome tab crash

https://github.com/elgalu/docker-selenium/issues/20#issuecomment-133011186

OMG @issuj you figured this out, I just tried below code and Chrome no longer crashes:

Simpy mount -v /dev/shm:/dev/shm

Or, longer, create a big shm

Started in privileged mode: docker run --privileged
Fix small /dev/shm size
docker exec $id sudo umount /dev/shm
docker exec $id sudo mount -t tmpfs -o rw,nosuid,nodev,noexec,relatime,size=512M tmpfs /dev/shm
However it would be nice to avoid privileged mode.
Any ideas @stonemaster @rongearley @jvermillard ?

Other refs:
docker/docker#3505 (comment)
docker/docker#4981 (comment)
docker/docker#2606 (comment)