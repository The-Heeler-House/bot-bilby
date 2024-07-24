import { Attachment, AttachmentBuilder } from "discord.js";
import { Db, GridFSBucket, ObjectId, WithId } from "mongodb";
import Trigger from "../Services/Database/models/trigger";
import { Services } from "../Services";

//! Increment the version number if there's change to the database models
const VERSION = 1

export async function updateTriggerDocuments(services: Services) {
    const triggerDb = services.database.collections.triggers
    const cursor = triggerDb.find()
    while (true) {
        let result = (await cursor.tryNext()) as WithId<Trigger> | null
        if (!result) break

        const currentVersion = result["_version"] ?? 0
        if (currentVersion == VERSION) continue

        //? the case will start from the current version of the document
        //? and will cascade down till the end of the switch case, so there's
        //? no need for a `break` command
        let filter = { _id: result._id }
        switch (currentVersion) {
            case 0:
                triggerDb.updateOne(
                    filter,
                    {
                        $set: {
                            attachmentIds: [],
                        }
                    }
                )
            default:
                triggerDb.updateOne(filter, {$set: { _version: VERSION }})
        }
    }
}

/**
 * Add a file to the database
 * @param db The database you want to add the file
 * @param attachment The Discord attachment
 * @returns The file ID in the database
 */
export async function addAttachmentToDb(db: Db, attachment: Attachment) {
    const res = await fetch(attachment.url)
    const data = await res.blob()
    const buffer = Buffer.from(await data.arrayBuffer())

    const bucket = new GridFSBucket(db)
    const uploadStream = bucket.openUploadStream(attachment.name)
    uploadStream.end(buffer)

    await new Promise((res, rej) => {
        uploadStream.on("finish", res)
        uploadStream.on("error", rej)
    })

    return uploadStream.id
}

/**
 * Remove a file from the database
 * @param db The database you want to remove the file from
 * @param id The ID of the file
 */
export async function removeAttachmentFromDb(db: Db, id: ObjectId) {
    await db.collection("fs.files").deleteOne({ _id: id })
    await db.collection("fs.chunks").deleteMany({ files_id: id })
}

/**
 * Create a Discord attachment from the file in the database
 * @param db The database containing the file
 * @param id The ID of the file
 * @returns The attachment builder
 */
export async function createDiscordAttachmentFromDb(db: Db, id: ObjectId) {
    const bucket = new GridFSBucket(db)
    const fileMetadata = await bucket.find({ _id: id }).next()
    const downloadStream = bucket.openDownloadStream(id)

    const attachmentBuilder = new AttachmentBuilder(
        Buffer.concat(await downloadStream.toArray()),
        { name: fileMetadata.filename }
    )
    return attachmentBuilder
}