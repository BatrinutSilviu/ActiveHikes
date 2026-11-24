-- An admin removed the participant as a driver: they can't choose "I'm driving" again until an admin allows it.
ALTER TABLE "HikeParticipant" ADD COLUMN "driverLocked" BOOLEAN NOT NULL DEFAULT false;
