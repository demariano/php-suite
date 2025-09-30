export class GetTownByAreaStatusQuery {
    constructor(public readonly status: string, public readonly areaId: string) {}
}
